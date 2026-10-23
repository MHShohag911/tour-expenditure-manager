
import { ObjectId, type Document } from "mongodb";
import { randomUUID } from "crypto";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "Tour-Expenditure-Management";
const COLLECTION_NAME = "TeamDB";

type Share = {
    memberName: string;
    amount: number;
};

type Expense = {
    id?: string;
    description: string;
    amount: number;
    payerName: string;
    time: string;
    createdAt?: string;
    shares?: Share[];
};


type DebtAdjustment = {
    debtId: string;
    amount: number;
};

type OutstandingDebt = {
    id: string;
    expenseId: string;
    fromMember: string;
    toMember: string;
    originalAmount: number;
    settledAmount: number;
    time: string;
    adjustments?: DebtAdjustment[];
};


type AccountTransaction = {
    id: string;
    type:
    | "deposit"
    | "expense_deduction"
    | "expense_credit"
    | "settlement"
    | "debt_netting";
    amount: number;
    description: string;
    time: string;
    balanceAfter: number;
    relatedExpenseId?: string;
};

type Member = {
    name: string;
    totalPaid: number;
    totalOwed: number;
    accountBalance?: number;
    accountTransactions?: AccountTransaction[];
};

type ExtraCharge = {
    extraAmount: number;
    paidBy: string;
    owedBy: string;
};

type GroupDocument = Document & {
    isFinished?: boolean;
    members?: Member[];
    expenses?: Expense[];
    extraCharges?: ExtraCharge[];
    settlements?: {
        id: string;
        fromMember: string;
        toMember: string;
        amount: number;
        time: string;
        relatedExpenseId: string;
        depositTransactionId?: string;
    }[];
    outstandingDebts?: OutstandingDebt[];
};

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return Response.json(
                { message: "Invalid group ID." },
                { status: 400 },
            );
        }

        const body = await request.json();

        const description =
            typeof body.description === "string" ? body.description.trim() : "";
        const amount = body.amount;
        const payerName =
            typeof body.payerName === "string" ? body.payerName.trim() : "";
        const time = typeof body.time === "string" ? body.time : "";
        const inputShares: Share[] = body.shares;

        if (!description || !payerName || !time) {
            return Response.json(
                { message: "Description, payer, and time are required." },
                { status: 400 },
            );
        }

        if (
            typeof amount !== "number" ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            return Response.json(
                { message: "Expense amount must be greater than zero." },
                { status: 400 },
            );
        }

        if (!Array.isArray(inputShares) || inputShares.length === 0) {
            return Response.json(
                { message: "Expense shares are required." },
                { status: 400 },
            );
        }

        if (
            inputShares.some(
                (share) =>
                    typeof share.memberName !== "string" ||
                    !share.memberName.trim() ||
                    typeof share.amount !== "number" ||
                    !Number.isFinite(share.amount) ||
                    share.amount < 0,
            )
        ) {
            return Response.json(
                { message: "One or more expense shares are invalid." },
                { status: 400 },
            );
        }

        const shares = inputShares.map((share) => ({
            memberName: share.memberName.trim(),
            amount: fromCents(toCents(share.amount)),
        }));

        if (
            new Set(shares.map((share) => share.memberName)).size !==
            shares.length
        ) {
            return Response.json(
                { message: "Each member must appear only once in the shares." },
                { status: 400 },
            );
        }

        if (
            shares.reduce((sum, share) => sum + toCents(share.amount), 0) !==
            toCents(amount)
        ) {
            return Response.json(
                { message: "Expense shares must equal the total amount." },
                { status: 400 },
            );
        }

        if (!shares.some((share) => share.memberName === payerName)) {
            return Response.json(
                { message: "The payer must be included in the shares." },
                { status: 400 },
            );
        }

        const client = await clientPromise;
        const collection = client
            .db(DATABASE_NAME)
            .collection<GroupDocument>(COLLECTION_NAME);

        const groupId = new ObjectId(id);
        const group = await collection.findOne({ _id: groupId });

        if (!group) {
            return Response.json(
                { message: "Group not found." },
                { status: 404 },
            );
        }

        const settlements = [...(group.settlements ?? [])];

        if (group.isFinished === true) {
            return Response.json(
                { message: "Cannot add an expense to a finished tour." },
                { status: 409 },
            );
        }

        const members = group.members ?? [];
        const memberNames = new Set(members.map((member) => member.name));

        if (
            !memberNames.has(payerName) ||
            shares.some((share) => !memberNames.has(share.memberName)) ||
            shares.length !== members.length
        ) {
            return Response.json(
                {
                    message:
                        "Shares must include every group member exactly once.",
                },
                { status: 400 },
            );
        }

        const expenseId = randomUUID();
        const transactionTime = new Date().toISOString();

        const updatedMembers = members.map((member) => ({
            ...member,
            accountBalance: Math.max(
                0,
                toCents(member.accountBalance ?? 0),
            ) / 100,
            accountTransactions: [...(member.accountTransactions ?? [])],
        }));

        const shareByMember = new Map(
            shares.map((share) => [share.memberName, toCents(share.amount)]),
        );



        const uncoveredShares = new Map<string, number>();

        const debts: OutstandingDebt[] = (
            group.outstandingDebts ?? []
        ).map((debt) => ({ ...debt }));

        const payer = updatedMembers.find(
            (member) => member.name === payerName,
        )!;

        // Track new debt credits so we can reconcile them without
        // accidentally using unrelated deposited funds.
        const creditPools = new Map<
            string,
            {
                remainingCents: number;
                balanceCreditRemainingCents: number;
            }
        >();

        // Deduct each member's share from their available A/C balance.
        for (const member of updatedMembers) {
            const shareCents = shareByMember.get(member.name)!;
            const availableCents = toCents(member.accountBalance ?? 0);
            const deductionCents = Math.min(
                availableCents,
                shareCents,
            );
            const uncoveredCents = shareCents - deductionCents;

            member.accountBalance = fromCents(
                availableCents - deductionCents,
            );

            uncoveredShares.set(member.name, uncoveredCents);

            if (deductionCents > 0) {
                member.accountTransactions!.push({
                    id: randomUUID(),
                    type: "expense_deduction",
                    amount: fromCents(deductionCents),
                    description: `A/C deduction: ${description}`,
                    time: transactionTime,
                    balanceAfter: member.accountBalance,
                    relatedExpenseId: expenseId,
                });

                // Using A/C credit to pay this expense payer also
                // reduces any debt this payer already owes the member.
                if (member.name !== payerName) {
                    let remainingOffsetCents = deductionCents;

                    const debtsToOffset = debts
                        .filter(
                            (debt) =>
                                debt.fromMember === payerName &&
                                debt.toMember === member.name,
                        )
                        .sort((a, b) => a.time.localeCompare(b.time));

                    for (const debt of debtsToOffset) {
                        if (remainingOffsetCents <= 0) break;

                        const outstandingCents =
                            toCents(debt.originalAmount) -
                            toCents(debt.settledAmount);

                        if (outstandingCents <= 0) continue;

                        const offsetCents = Math.min(
                            remainingOffsetCents,
                            outstandingCents,
                        );


                        debt.settledAmount = fromCents(
                            toCents(debt.settledAmount) + offsetCents,
                        );

                        debt.adjustments = [
                            ...(debt.adjustments ?? []),
                            {
                                debtId: expenseId,
                                amount: fromCents(offsetCents),
                            },
                        ];

                        remainingOffsetCents -= offsetCents;

                    }
                }

            }
        }

        // Record each unpaid share as a debt to the expense payer.
        for (const member of updatedMembers) {
            if (member.name === payerName) continue;

            const debtCents = uncoveredShares.get(member.name) ?? 0;

            if (debtCents <= 0) continue;

            const debtId = randomUUID();

            debts.push({
                id: debtId,
                expenseId,
                fromMember: member.name,
                toMember: payerName,
                originalAmount: fromCents(debtCents),
                settledAmount: 0,
                time: transactionTime,
            });

            payer.accountBalance = fromCents(
                toCents(payer.accountBalance ?? 0) + debtCents,
            );

            payer.accountTransactions!.push({
                id: randomUUID(),
                type: "expense_credit",
                amount: fromCents(debtCents),
                description: `A/C credit: ${description} (${member.name}'s share)`,
                time: transactionTime,
                balanceAfter: payer.accountBalance,
                relatedExpenseId: expenseId,
            });

            creditPools.set(debtId, {
                remainingCents: debtCents,
                balanceCreditRemainingCents: debtCents,
            });
        }

        // Reconcile debt chains such as Mamun -> Kawsar -> Shohag.
        // The intermediary's newly created A/C credit is redirected,
        // while the original creditor keeps their existing credit.
        while (true) {
            let reconciled = false;

            for (const [incomingDebtId, pool] of creditPools) {
                if (pool.remainingCents <= 0) continue;

                const incomingDebt = debts.find(
                    (debt) => debt.id === incomingDebtId,
                );

                if (!incomingDebt) continue;

                const incomingOutstanding =
                    toCents(incomingDebt.originalAmount) -
                    toCents(incomingDebt.settledAmount);

                if (incomingOutstanding <= 0) continue;

                const intermediary = incomingDebt.toMember;

                const outgoingDebt = debts.find(
                    (debt) =>
                        debt.id !== incomingDebt.id &&
                        debt.fromMember === intermediary &&
                        toCents(debt.originalAmount) -
                        toCents(debt.settledAmount) >
                        0,
                );

                if (!outgoingDebt) continue;

                const outgoingOutstanding =
                    toCents(outgoingDebt.originalAmount) -
                    toCents(outgoingDebt.settledAmount);

                const netCents = Math.min(
                    pool.remainingCents,
                    incomingOutstanding,
                    outgoingOutstanding,
                );

                if (netCents <= 0) continue;


                incomingDebt.settledAmount = fromCents(
                    toCents(incomingDebt.settledAmount) + netCents,
                );

                incomingDebt.adjustments = [
                    ...(incomingDebt.adjustments ?? []),
                    {
                        debtId: expenseId,
                        amount: fromCents(netCents),
                    },
                ];

                outgoingDebt.settledAmount = fromCents(
                    toCents(outgoingDebt.settledAmount) + netCents,
                );

                outgoingDebt.adjustments = [
                    ...(outgoingDebt.adjustments ?? []),
                    {
                        debtId: expenseId,
                        amount: fromCents(netCents),
                    },
                ];


                pool.remainingCents -= netCents;

                const intermediaryMember = updatedMembers.find(
                    (member) => member.name === intermediary,
                );

                if (!intermediaryMember) {
                    throw new Error(
                        `Member not found during debt reconciliation: ${intermediary}`,
                    );
                }

                const balanceReductionCents = Math.min(
                    netCents,
                    pool.balanceCreditRemainingCents,
                    toCents(intermediaryMember.accountBalance ?? 0),
                );

                if (balanceReductionCents > 0) {
                    intermediaryMember.accountBalance = fromCents(
                        toCents(intermediaryMember.accountBalance ?? 0) -
                        balanceReductionCents,
                    );

                    intermediaryMember.accountTransactions!.push({
                        id: randomUUID(),
                        type: "debt_netting",
                        amount: fromCents(balanceReductionCents),
                        description: `A/C credit redirected to ${outgoingDebt.toMember}`,
                        time: transactionTime,
                        balanceAfter: intermediaryMember.accountBalance,
                        relatedExpenseId: expenseId,
                    });

                    pool.balanceCreditRemainingCents -=
                        balanceReductionCents;
                }

                // If the debt forms a cycle (A -> B -> A), it cancels
                // without creating a debt from a member to themselves.
                if (incomingDebt.fromMember !== outgoingDebt.toMember) {
                    const replacementDebtId = randomUUID();

                    debts.push({
                        id: replacementDebtId,
                        expenseId,
                        fromMember: incomingDebt.fromMember,
                        toMember: outgoingDebt.toMember,
                        originalAmount: fromCents(netCents),
                        settledAmount: 0,
                        time: transactionTime,
                    });

                    // This replacement carries the debt chain forward,
                    // but does not create another A/C balance credit.
                    creditPools.set(replacementDebtId, {
                        remainingCents: netCents,
                        balanceCreditRemainingCents: 0,
                    });
                }

                reconciled = true;
                break;
            }

            if (!reconciled) break;
        }


        const expense: Expense = {
            id: expenseId,
            description,
            amount: fromCents(toCents(amount)),
            payerName,
            time,
            createdAt: transactionTime,
            shares,
        };

        const expenses = [...(group.expenses ?? []), expense];
        const extraCharges = group.extraCharges ?? [];

        // Preserve gross expense totals and existing extra-charge behavior.
        for (const member of updatedMembers) {
            const grossPaidCents = expenses.reduce(
                (sum, item) =>
                    sum +
                    (item.payerName === member.name ? toCents(item.amount) : 0),
                0,
            );

            const extraPaidCents = extraCharges.reduce(
                (sum, item) =>
                    sum +
                    (item.paidBy === member.name
                        ? toCents(item.extraAmount)
                        : 0),
                0,
            );

            const grossOwedCents = expenses.reduce((sum, item) => {
                const savedShare = item.shares?.find(
                    (share) => share.memberName === member.name,
                );

                const shareCents = item.shares
                    ? toCents(savedShare?.amount ?? 0)
                    : members.length > 0
                        ? Math.floor(toCents(item.amount) / members.length)
                        : 0;

                return sum + shareCents;
            }, 0);

            const extraOwedCents = extraCharges.reduce(
                (sum, item) =>
                    sum +
                    (item.owedBy === member.name
                        ? toCents(item.extraAmount)
                        : 0),
                0,
            );

            member.totalPaid = fromCents(grossPaidCents + extraPaidCents);
            member.totalOwed = fromCents(grossOwedCents + extraOwedCents);
        }

        const result = await collection.updateOne(
            { _id: groupId, isFinished: { $ne: true } },
            {
                $set: {
                    members: updatedMembers,
                    expenses,
                    outstandingDebts: debts,
                    settlements,
                },
            },
        );

        if (result.matchedCount === 0) {
            return Response.json(
                {
                    message:
                        "The tour was finished before the expense could be saved.",
                },
                { status: 409 },
            );
        }

        return Response.json(
            {
                message: "Expense saved successfully.",
                expense,
            },
            { status: 201 },
        );
    } catch (error) {
        console.error("Failed to add expense:", error);

        return Response.json(
            { message: "Failed to add expense." },
            { status: 500 },
        );
    }
}
