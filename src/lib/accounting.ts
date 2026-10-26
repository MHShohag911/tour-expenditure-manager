// src/lib/accounting.ts
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type {
    Group,
    Member,
    Expense,
    Deposit,
    OutstandingDebt,
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
    return Number.MAX_SAFE_INTEGER;
};

const getCreatedAt = (item: { createdAt?: string }): string => item.createdAt ?? "";

const sortBySequenceThenId = <T extends { sequence?: number; id?: string }>(a: T, b: T): number => {
    const sa = getSequence(a);
    const sb = getSequence(b);
    if (sa !== sb) return sa - sb;
    const ia = a.id ?? "";
    const ib = b.id ?? "";
    return ia.localeCompare(ib);
};

const ensureTransaction = (memberDraft: MemberDraft, transaction: AccountTransaction) => {
    memberDraft.transactions.push(transaction);
};

const findMemberDraft = (drafts: Map<string, MemberDraft>, name: string): MemberDraft => {
    const draft = drafts.get(name);
    if (!draft) throw new Error(`Unknown member: ${name}`);
    return draft;
};

const findMemberInput = (group: Group, name: string): Member => {
    const member = group.members.find((m) => m.name === name);
    if (!member) throw new Error(`Unknown member: ${name}`);
    return member;
};

function recalculate(inputGroup: Group): Group {
    const members = inputGroup.members ?? [];
    const expenses = inputGroup.expenses ?? [];
    const deposits = inputGroup.deposits ?? [];

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

    for (const entry of timeline) {
        if (entry.kind === "expense") {
            const expense = entry.item;
            const payerDraft = findMemberDraft(memberDrafts, expense.payerName);
            findMemberInput(inputGroup, expense.payerName);

            const payerName = expense.payerName;
            const expenseAmountCents = toCents(expense.amount);

            payerDraft.totalPaidCents += expenseAmountCents;

            const shares = expense.shares ?? [];
            for (const share of shares) {
                const draft = findMemberDraft(memberDrafts, share.memberName);
                findMemberInput(inputGroup, share.memberName);

                const shareCents = toCents(share.amount);
                draft.totalOwedCents += shareCents;

                if (share.memberName === payerName) continue;

                debts.push({
                    id: `${expense.id ?? ""}:debt:${share.memberName}`,
                    expenseId: expense.id ?? "",
                    fromMember: share.memberName,
                    toMember: payerName,
                    originalAmount: fromCents(shareCents),
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
        }
    }

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
                nextSequence: next.nextSequence,
            },
        },
    );

    return next;
}