import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "Tour-Expenditure-Management";
const COLLECTION_NAME = "TeamDB";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ExpenseRecord = {
  id?: string;
  description: string;
  amount: number;
  payerName: string;
  time: string;
  createdAt?: string;
  shares?: {
    memberName: string;
    amount: number;
  }[];
};

type MemberRecord = {
  name: string;
  totalPaid: number;
  totalOwed: number;
};

type ExtraChargeRecord = {
  extraAmount: number;
  paidBy: string;
  owedBy: string;
};

const toCents = (amount: number) => Math.round(amount * 100);
const fromCents = (cents: number) => cents / 100;

const parseLegacyTime = (value: string): string | null => {
  if (typeof value !== "string") return null;

  const match = value
    .trim()
    .match(
      /^(\d{1,2})\/(\d{1,2})\/(\d{4}),\s*(\d{1,2}):(\d{2}):(\d{2})\s*(am|pm)$/i,
    );

  if (!match) return null;

  const [, dd, mm, yyyy, hh, min, ss, meridiem] = match;
  let hour = Number(hh);
  const isPm = meridiem.toLowerCase() === "pm";
  const isAm = meridiem.toLowerCase() === "am";

  if (isPm && hour !== 12) hour += 12;
  if (isAm && hour === 12) hour = 0;

  const date = new Date(
    Number(yyyy),
    Number(mm) - 1,
    Number(dd),
    hour,
    Number(min),
    Number(ss),
  );

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString();
};

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const expenseId = searchParams.get("expenseId");

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid group ID." },
        { status: 400 }
      );
    }

    if (!expenseId) {
      return NextResponse.json(
        { message: "Missing expense ID." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const collection = client
      .db(DATABASE_NAME)
      .collection(COLLECTION_NAME);

    const group = await collection.findOne({
      _id: new ObjectId(id),
    });

    if (!group) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 }
      );
    }

    const rawExpenses = (group.expenses ?? []) as ExpenseRecord[];
    const members = (group.members ?? []) as MemberRecord[];
    const extraCharges = (group.extraCharges ?? []) as ExtraChargeRecord[];

    const now = new Date().toISOString();

    // Ensure legacy expenses have stable ids so they can be targeted.
    const expenses = rawExpenses.map((item) => {
      const hasId = typeof item.id === "string" && item.id.length > 0;
      const hasCreatedAt =
        typeof item.createdAt === "string" && item.createdAt.length > 0;

      if (hasId && hasCreatedAt) return item;

      return {
        ...item,
        id: hasId ? item.id : randomUUID(),
        createdAt: hasCreatedAt
          ? item.createdAt
          : parseLegacyTime(item.time) ?? now,
      };
    });

    const targetIndex = expenses.findIndex(
      (expense) => expense.id === expenseId
    );

    if (targetIndex === -1) {
      return NextResponse.json(
        { message: "Expense not found." },
        { status: 404 }
      );
    }

    const remainingExpenses = expenses.filter(
      (_, i) => i !== targetIndex
    );

    const updatedMembers = members.map((member) => {
      const totalPaidFromExpensesCents = remainingExpenses.reduce(
        (total, expense) =>
          expense.payerName === member.name
            ? total + toCents(expense.amount)
            : total,
        0
      );

      const totalOwedFromExpensesCents = remainingExpenses.reduce(
        (total, expense) => {
          if (expense.shares && expense.shares.length > 0) {
            const memberShare = expense.shares.find(
              (share) => share.memberName === member.name
            );
            return total + toCents(memberShare?.amount ?? 0);
          }

          if (members.length === 0) return total;

          return (
            total + Math.floor(toCents(expense.amount) / members.length)
          );
        },
        0
      );

      const totalPaidFromExtraChargesCents = extraCharges.reduce(
        (total, charge) =>
          charge.paidBy === member.name
            ? total + toCents(charge.extraAmount)
            : total,
        0
      );

      const totalOwedFromExtraChargesCents = extraCharges.reduce(
        (total, charge) =>
          charge.owedBy === member.name
            ? total + toCents(charge.extraAmount)
            : total,
        0
      );

      return {
        ...member,
        totalPaid: fromCents(
          totalPaidFromExpensesCents + totalPaidFromExtraChargesCents
        ),
        totalOwed: fromCents(
          totalOwedFromExpensesCents + totalOwedFromExtraChargesCents
        ),
      };
    });

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          expenses: remainingExpenses,
          members: updatedMembers,
        },
      }
    );

    return NextResponse.json({
      message: "Expense deleted and balances recalculated.",
      expenses: remainingExpenses,
      members: updatedMembers,
    });
  } catch (error) {
    console.error("Failed to delete expense:", error);

    return NextResponse.json(
      { message: "Failed to delete expense." },
      { status: 500 }
    );
  }
}