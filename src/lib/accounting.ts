// src/lib/accounting.ts
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type {
    Group,
    Member,
    Expense,
    Deposit,
    OutstandingDebt,
    Settlement,
    AccountTransaction,
} from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

export const toCents = (amount: number) => Math.round(amount * 100);
export const fromCents = (cents: number) => cents / 100;

type TimelineItem =
    | { kind: "expense"; item: Expense }
    | { kind: "deposit"; item: Deposit };

type DebtDraft = OutstandingDebt & { _settledCents: number };
type SettleDraft = Settlement;

type MemberDraft = {
    name: string;
    totalPaidCents: number;
    totalOwedCents: number;
    balanceCents: number;
    transactions: AccountTransaction[];
};

const getSequence = (item: { sequence?: number }): number => {
    if (typeof item.sequence === "number" && Number.isFinite(item.sequence)) {
        return item.sequence;
    }
    // Deterministic fallback for legacy data without sequence.
    return Number.MAX_SAFE_INTEGER;
};

const getCreatedAt = (item: {
    createdAt?: string;
}): string => item.createdAt ?? "";

const sortBySequenceThenId = <T extends { sequence?: number; id?: string }>(
    a: T,
    b: T,
): number => {
    const sa = getSequence(a);
    const sb = getSequence(b);
    if (sa !== sb) return sa - sb;
    const ia = a.id ?? "";
    const ib = b.id ?? "";
    return ia.localeCompare(ib);
};

const ensureTransaction = (
    memberDraft: MemberDraft,
    transaction: AccountTransaction,
) => {
    memberDraft.transactions.push(transaction);
};

const findMemberDraft = (
    drafts: Map<string, MemberDraft>,
    name: string,
): MemberDraft => {
    const draft = drafts.get(name);
    if (!draft) {
        throw new Error(`Unknown member in financial data: ${name}`);
    }
    return draft;
};

const findMemberInput = (group: Group, name: string): Member => {
    const member = group.members.find((m) => m.name === name);
    if (!member) {
        throw new Error(`Unknown member in financial data: ${name}`);
    }
    return member;
};

export function recalculate(inputGroup: Group): Group {
    const members = inputGroup.members ?? [];
    const expenses = inputGroup.expenses ?? [];
    const deposits = inputGroup.deposits ?? [];

    // Step 0 — reset all derived state.
    const memberDrafts = new Map<string, MemberDraft>();
    for (const member of members) {
        memberDrafts.set(member.name, {
            name: member.name,
            totalPaidCents: 0,
            totalOwedCents: 0,
            balanceCents: 0,
            transactions: [],
        });
    }

    const debts: DebtDraft[] = [];
    const settlements: SettleDraft[] = [];

    // Step 1 — build the timeline.
    const timeline: TimelineItem[] = [
        ...expenses.map<TimelineItem>((item) => ({ kind: "expense", item })),
        ...deposits.map<TimelineItem>((item) => ({ kind: "deposit", item })),
    ];

    timeline.sort((a, b) =>
        sortBySequenceThenId(
            { sequence: getSequence(a.item as { sequence?: number }), id: a.item.id ?? "" },
            { sequence: getSequence(b.item as { sequence?: number }), id: b.item.id ?? "" },
        ),
    );

    // Step 2 — replay in chronological (sequence) order.
    for (const entry of timeline) {
        if (entry.kind === "expense") {
            const expense = entry.item;
            const payerDraft = findMemberDraft(memberDrafts, expense.payerName);
            findMemberInput(inputGroup, expense.payerName);

            const payerName = expense.payerName;
            const expenseAmountCents = toCents(expense.amount);

            // totalPaid (gross) — only the payer.
            payerDraft.totalPaidCents += expenseAmountCents;

            const shares = expense.shares ?? [];
            for (const share of shares) {
                const draft = findMemberDraft(memberDrafts, share.memberName);
                findMemberInput(inputGroup, share.memberName);

                const shareCents = toCents(share.amount);
                draft.totalOwedCents += shareCents;

                if (share.memberName === payerName) continue;

                const deduction = Math.min(draft.balanceCents, shareCents);
                if (deduction > 0) {
                    draft.balanceCents -= deduction;
                    ensureTransaction(draft, {
                        id: `${expense.id ?? ""}:deduct:${share.memberName}`,
                        type: "expense_deduction",
                        amount: fromCents(deduction),
                        description: `Share of ${expense.description}`,
                        createdAt: getCreatedAt(expense),
                        sequence: getSequence(expense),
                        relatedExpenseId: expense.id,
                        balanceAfter: fromCents(draft.balanceCents),
                        creditAfter: 0,
                    });
                }

                const uncovered = shareCents - deduction;
                if (uncovered <= 0) continue;
                if (share.memberName === payerName) continue;

                debts.push({
                    id: `${expense.id ?? ""}:debt:${share.memberName}`,
                    expenseId: expense.id ?? "",
                    fromMember: share.memberName,
                    toMember: payerName,
                    originalAmount: fromCents(uncovered),
                    settledAmount: 0,
                    createdAt: getCreatedAt(expense),
                    sequence: getSequence(expense),
                    _settledCents: 0,
                });
            }
        } else {
            const deposit = entry.item;
            const draft = findMemberDraft(memberDrafts, deposit.memberName);
            findMemberInput(inputGroup, deposit.memberName);

            const depositCents = toCents(deposit.amount);
            draft.balanceCents += depositCents;

            ensureTransaction(draft, {
                id: `${deposit.id}:deposit`,
                type: "deposit",
                amount: fromCents(depositCents),
                description: deposit.description,
                createdAt: deposit.createdAt,
                sequence: deposit.sequence,
                relatedDepositId: deposit.id,
                balanceAfter: fromCents(draft.balanceCents),
                creditAfter: 0,
            });

            const candidates = debts
                .filter(
                    (debt) =>
                        debt.fromMember === deposit.memberName &&
                        debt._settledCents < toCents(debt.originalAmount),
                )
                .sort(sortBySequenceThenId);

            let remaining = draft.balanceCents;

            for (const debt of candidates) {
                if (remaining <= 0) break;

                const oweCents = toCents(debt.originalAmount) - debt._settledCents;
                if (oweCents <= 0) continue;

                const payCents = Math.min(remaining, oweCents);
                debt._settledCents += payCents;
                debt.settledAmount = fromCents(debt._settledCents);
                remaining -= payCents;
                draft.balanceCents -= payCents;

                const creditorDraft = findMemberDraft(memberDrafts, debt.toMember);

                settlements.push({
                    id: `${deposit.id}:settle:${debt.id}`,
                    fromMember: deposit.memberName,
                    toMember: debt.toMember,
                    amount: fromCents(payCents),
                    expenseId: debt.expenseId,
                    depositId: deposit.id,
                    createdAt: deposit.createdAt,
                    sequence: deposit.sequence,
                });

                ensureTransaction(draft, {
                    id: `${deposit.id}:settle:${debt.id}:from`,
                    type: "settlement",
                    amount: fromCents(payCents),
                    description: `Settled debt to ${debt.toMember}`,
                    createdAt: deposit.createdAt,
                    sequence: deposit.sequence,
                    relatedDepositId: deposit.id,
                    relatedMemberName: debt.toMember,
                    relatedExpenseId: debt.expenseId,
                    balanceAfter: fromCents(draft.balanceCents),
                    creditAfter: 0,
                });

                ensureTransaction(creditorDraft, {
                    id: `${deposit.id}:settle:${debt.id}:to`,
                    type: "settlement",
                    amount: fromCents(payCents),
                    description: `Settled debt from ${deposit.memberName}`,
                    createdAt: deposit.createdAt,
                    sequence: deposit.sequence,
                    relatedDepositId: deposit.id,
                    relatedMemberName: deposit.memberName,
                    relatedExpenseId: debt.expenseId,
                    balanceAfter: fromCents(creditorDraft.balanceCents),
                    creditAfter: 0,
                });
            }
        }
    }

    // Step 3 — reciprocal netting.
    const unsettled = debts.filter(
        (debt) => debt._settledCents < toCents(debt.originalAmount),
    );
    const nettingSequence = timeline.length > 0
        ? Math.max(...timeline.map((entry) => getSequence(entry.item as { sequence?: number }))) + 1
        : 1;

    for (let i = 0; i < unsettled.length; i += 1) {
        const d1 = unsettled[i];
        if (d1._settledCents >= toCents(d1.originalAmount)) continue;

        for (let j = i + 1; j < unsettled.length; j += 1) {
            const d2 = unsettled[j];
            if (d2._settledCents >= toCents(d2.originalAmount)) continue;

            const reciprocal =
                d1.fromMember === d2.toMember && d1.toMember === d2.fromMember;
            if (!reciprocal) continue;

            const d1Owe = toCents(d1.originalAmount) - d1._settledCents;
            const d2Owe = toCents(d2.originalAmount) - d2._settledCents;
            const pay = Math.min(d1Owe, d2Owe);
            if (pay <= 0) continue;

            d1._settledCents += pay;
            d2._settledCents += pay;
            d1.settledAmount = fromCents(d1._settledCents);
            d2.settledAmount = fromCents(d2._settledCents);

            const creditorDraft = findMemberDraft(memberDrafts, d1.toMember);
            const debtorDraft = findMemberDraft(memberDrafts, d1.fromMember);

            ensureTransaction(debtorDraft, {
                id: `net:${d1.id}:${d2.id}:from`,
                type: "debt_netting",
                amount: fromCents(pay),
                description: `Offset reciprocal debt with ${d1.toMember}`,
                createdAt: getCreatedAt(d1),
                sequence: nettingSequence,
                relatedMemberName: d1.toMember,
                relatedExpenseId: d1.expenseId,
                balanceAfter: fromCents(debtorDraft.balanceCents),
                creditAfter: 0,
            });

            ensureTransaction(creditorDraft, {
                id: `net:${d1.id}:${d2.id}:to`,
                type: "debt_netting",
                amount: fromCents(pay),
                description: `Offset reciprocal debt with ${d1.fromMember}`,
                createdAt: getCreatedAt(d1),
                sequence: nettingSequence,
                relatedMemberName: d1.fromMember,
                relatedExpenseId: d1.expenseId,
                balanceAfter: fromCents(creditorDraft.balanceCents),
                creditAfter: 0,
            });

            settlements.push({
                id: `net:${d1.id}:${d2.id}`,
                fromMember: d1.fromMember,
                toMember: d1.toMember,
                amount: fromCents(pay),
                expenseId: d1.expenseId,
                depositId: "netting",
                createdAt: getCreatedAt(d1),
                sequence: nettingSequence,
            });
        }
    }

    // Step 4 — accountCreditBalance from remaining debts.
    const creditCents = new Map<string, number>();
    for (const member of members) creditCents.set(member.name, 0);

    const finalDebts: OutstandingDebt[] = debts.map((debt) => {
        const remaining = toCents(debt.originalAmount) - debt._settledCents;
        if (remaining > 0) {
            creditCents.set(
                debt.toMember,
                (creditCents.get(debt.toMember) ?? 0) + remaining,
            );
        }
        const { _settledCents, ...rest } = debt;
        void _settledCents;
        return rest;
    });

    // Step 5/6 — write back.
    const updatedMembers: Member[] = members.map((member) => {
        const draft = findMemberDraft(memberDrafts, member.name);
        return {
            ...member,
            totalPaid: fromCents(draft.totalPaidCents),
            totalOwed: fromCents(draft.totalOwedCents),
            accountBalance: fromCents(draft.balanceCents),
            accountCreditBalance: fromCents(creditCents.get(member.name) ?? 0),
            accountTransactions: draft.transactions,
        };
    });

    return {
        ...inputGroup,
        members: updatedMembers,
        deposits,
        outstandingDebts: finalDebts,
        settlements,
    };
}

export async function mutateGroup(
    groupId: string,
    mutate: (draft: Group) => void,
): Promise<Group> {
    if (!ObjectId.isValid(groupId)) {
        throw new Error("Invalid group ID.");
    }

    const client = await clientPromise;
    const collection = client
        .db(DATABASE_NAME)
        .collection<Omit<Group, "_id"> & { _id: ObjectId }>(COLLECTION_NAME);

    const raw = await collection.findOne({ _id: new ObjectId(groupId) });
    if (!raw) {
        throw new Error("Group not found.");
    }

    const draft: Group = {
        ...raw,
        _id: raw._id.toString(),
        members: (raw.members ?? []).map((member) => ({
            ...member,
            accountBalance: member.accountBalance ?? 0,
            accountCreditBalance: member.accountCreditBalance ?? 0,
            accountTransactions: member.accountTransactions ?? [],
        })),
        expenses: raw.expenses ?? [],
        deposits: raw.deposits ?? [],
        outstandingDebts: raw.outstandingDebts ?? [],
        settlements: raw.settlements ?? [],
        nextSequence: raw.nextSequence ?? 0,
    };

    mutate(draft);

    const next = recalculate(draft);

    await collection.updateOne(
        { _id: new ObjectId(groupId) },
        {
            $set: {
                members: next.members,
                expenses: next.expenses,
                deposits: next.deposits,
                outstandingDebts: next.outstandingDebts,
                settlements: next.settlements,
                nextSequence: next.nextSequence,
            },
        },
    );

    return next;
}