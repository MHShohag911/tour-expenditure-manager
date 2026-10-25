import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { randomUUID } from "crypto";
import clientPromise from "@/lib/mongodb";
import { mutateGroup } from "@/lib/accounting";
import type { Group } from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
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
  sequence?: number;
  shares?: { memberName: string; amount: number }[];
};

type GroupRecord = {
  expenses?: ExpenseRecord[];
};

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

    const group = await collection.findOne<GroupRecord>({
      _id: new ObjectId(id),
    });

    if (!group) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();

    const normalized = (group.expenses ?? []).map((item, i) => {
      const hasId = typeof item.id === "string" && item.id.length > 0;
      const hasCreatedAt =
        typeof item.createdAt === "string" && item.createdAt.length > 0;
      const hasSequence =
        typeof item.sequence === "number" && Number.isFinite(item.sequence);

      if (hasId && hasCreatedAt && hasSequence) return item;

      return {
        ...item,
        id: hasId ? item.id : randomUUID(),
        createdAt: hasCreatedAt
          ? item.createdAt
          : parseLegacyTime(item.time) ?? now,
        sequence: hasSequence ? item.sequence : i + 1,
      };
    });

    if (!normalized.some((expense) => expense.id === expenseId)) {
      return NextResponse.json(
        { message: "Expense not found." },
        { status: 404 }
      );
    }

    let remainingExpenses: ExpenseRecord[] = [];

    try {
      await mutateGroup(id, (draft: Group) => {
        draft.expenses = normalized;
        remainingExpenses = normalized.filter(
          (expense) => expense.id !== expenseId
        );
        draft.expenses = remainingExpenses;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "FINISHED") {
        return NextResponse.json(
          { message: "Cannot delete expense from a finished tour." },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      message: "Expense deleted and balances recalculated.",
      expenses: remainingExpenses,
    });
  } catch (error) {
    console.error("Failed to delete expense:", error);

    return NextResponse.json(
      { message: "Failed to delete expense." },
      { status: 500 }
    );
  }
}