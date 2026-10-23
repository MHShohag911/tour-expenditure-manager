
import { ObjectId, type Document } from "mongodb";
import { randomUUID } from "crypto";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

type AccountTransaction = {
  id: string;
  type: "deposit" | "expense_deduction" | "expense_credit" | "settlement";
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

type OutstandingDebt = {
  id: string;
  expenseId: string;
  fromMember: string;
  toMember: string;
  originalAmount: number;
  settledAmount: number;
  time: string;
};

type Settlement = {
  id: string;
  fromMember: string;
  toMember: string;
  amount: number;
  time: string;
  relatedExpenseId: string;
  depositTransactionId: string;
};

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const client = await clientPromise;
  const session = client.startSession();

  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid group ID." },
        { status: 400 },
      );
    }

    const body = await request.json();

    const memberName =
      typeof body.memberName === "string" ? body.memberName.trim() : "";

    const amount = body.amount;

    const description =
      typeof body.description === "string" && body.description.trim()
        ? body.description.trim()
        : "A/C deposit";

    if (!memberName) {
      return Response.json(
        { message: "Member name is required." },
        { status: 400 },
      );
    }

    if (
      typeof amount !== "number" ||
      !Number.isFinite(amount) ||
      amount <= 0 ||
      !Number.isSafeInteger(toCents(amount))
    ) {
      return Response.json(
        { message: "Deposit amount must be greater than zero." },
        { status: 400 },
      );
    }

    const db = client.db(DATABASE_NAME);
    const collection = db.collection<Document>(COLLECTION_NAME);
    const groupId = new ObjectId(id);

    let response:
      | { status: number; body: Record<string, unknown> }
      | undefined;

    await session.withTransaction(async () => {
      const group = await collection.findOne(
        { _id: groupId },
        { session },
      );

      if (!group) {
        response = {
          status: 404,
          body: { message: "Group not found." },
        };
        return;
      }

      if (group.isFinished === true) {
        response = {
          status: 409,
          body: { message: "Cannot add a deposit to a finished tour." },
        };
        return;
      }

      const members: Member[] = (group.members ?? []).map(
        (member: Member) => ({
          ...member,
          accountBalance: member.accountBalance ?? 0,
          accountTransactions: [...(member.accountTransactions ?? [])],
        }),
      );

      const depositingMember = members.find(
        (member) => member.name === memberName,
      );

      if (!depositingMember) {
        response = {
          status: 404,
          body: { message: "Member not found." },
        };
        return;
      }

      const debts: OutstandingDebt[] = (
        group.outstandingDebts ?? []
      ).map((debt: OutstandingDebt) => ({ ...debt }));

      const settlements: Settlement[] = [
        ...(group.settlements ?? []),
      ];

      const deposits = [...(group.deposits ?? [])];

      const transactionId = randomUUID();
      const transactionTime = new Date().toISOString();

      deposits.push({
        id: transactionId,
        memberName,
        amount,
        description,
        time: transactionTime,
      });

      let remainingDepositCents = toCents(amount);
      let availableBalanceCents = toCents(
        depositingMember.accountBalance ?? 0,
      );

      // Add the deposit first, then use it to settle debts.
      availableBalanceCents += remainingDepositCents;

      depositingMember.accountTransactions!.push({
        id: transactionId,
        type: "deposit",
        amount,
        description,
        time: transactionTime,
        balanceAfter: fromCents(availableBalanceCents),
      });

      // Oldest outstanding debt is settled first (FIFO).
      const sortedDebts = debts
        .map((debt, index) => ({ debt, index }))
        .filter(
          ({ debt }) =>
            debt.fromMember === memberName &&
            toCents(debt.originalAmount) >
            toCents(debt.settledAmount),
        )
        .sort(
          (a, b) =>
            a.debt.time.localeCompare(b.debt.time) ||
            a.index - b.index,
        );

      for (const { debt } of sortedDebts) {
        if (remainingDepositCents <= 0) break;

        const outstandingCents = Math.max(
          0,
          toCents(debt.originalAmount) -
          toCents(debt.settledAmount),
        );

        const settlementCents = Math.min(
          remainingDepositCents,
          outstandingCents,
        );

        if (settlementCents <= 0) continue;

        const payer = members.find(
          (member) => member.name === debt.toMember,
        );

        if (!payer) {
          throw new Error(
            `Creditor "${debt.toMember}" not found for debt ${debt.id}.`,
          );
        }

        remainingDepositCents -= settlementCents;
        availableBalanceCents -= settlementCents;

        debt.settledAmount = fromCents(
          toCents(debt.settledAmount) + settlementCents,
        );


        // Available A/C balance.

        payer.accountBalance = fromCents(
          Math.max(
            0,
            toCents(payer.accountBalance ?? 0) - settlementCents,
          ),
        );


        const settlementId = randomUUID();
        const settlementAmount = fromCents(settlementCents);

        const settlementDescription =
          `Debt settlement with ${memberName}`;

        // Record the settlement in the debtor's statement.
        depositingMember.accountTransactions!.push({
          id: randomUUID(),
          type: "settlement",
          amount: settlementAmount,
          description:
            `Paid ${debt.toMember} for: ${debt.expenseId}`,
          time: transactionTime,
          balanceAfter: fromCents(availableBalanceCents),
          relatedExpenseId: debt.expenseId,
        });

        // Record the reduced credit in the creditor's statement.
        payer.accountTransactions!.push({
          id: randomUUID(),
          type: "settlement",
          amount: settlementAmount,
          description: settlementDescription,
          time: transactionTime,
          balanceAfter: payer.accountBalance ?? 0,
          relatedExpenseId: debt.expenseId,
        });

        settlements.push({
          id: settlementId,
          fromMember: memberName,
          toMember: debt.toMember,
          amount: settlementAmount,
          time: transactionTime,
          relatedExpenseId: debt.expenseId,
          depositTransactionId: transactionId,
        });
      }

      // Only the money left after settlements remains available.
      depositingMember.accountBalance = fromCents(
        availableBalanceCents,
      );

      // Keep the deposit statement's final balance accurate.
      const depositTransaction =
        depositingMember.accountTransactions!.find(
          (transaction) => transaction.id === transactionId,
        );

      if (depositTransaction) {
        depositTransaction.balanceAfter =
          depositingMember.accountBalance;
      }

      const result = await collection.updateOne(
        {
          _id: groupId,
          isFinished: { $ne: true },
        },
        {
          $set: {
            members,
            deposits,
            outstandingDebts: debts,
            settlements,
          },
        },
        { session },
      );

      if (result.matchedCount === 0) {
        throw new Error("Group changed or was finished during deposit.");
      }

      response = {
        status: 200,
        body: {
          message: "Deposit added and debts settled successfully.",
          transactionId,
          depositedAmount: amount,
          amountUsedForSettlements: fromCents(
            toCents(amount) - remainingDepositCents,
          ),
          remainingAccountBalance: depositingMember.accountBalance,
        },
      };
    });

    if (!response) {
      return Response.json(
        { message: "Deposit could not be processed." },
        { status: 500 },
      );
    }

    return Response.json(response.body, { status: response.status });
  } catch (error) {
    console.error("Error adding A/C deposit:", error);

    return Response.json(
      { message: "Failed to add deposit." },
      { status: 500 },
    );
  } finally {
    await session.endSession();
  }
}
