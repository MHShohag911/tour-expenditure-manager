import { ObjectId, type Document } from "mongodb";
import { randomUUID } from "crypto";
import clientPromise from "@/lib/mongodb";
import { mutateGroup, toCents, fromCents } from "@/lib/accounting";
import type { Expense, Group } from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

type Share = {
  memberName: string;
  amount: number;
  note?: string;
};

type GroupDocument = Document & {
  isFinished?: boolean;
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

    const shares = inputShares.map((share) => {
      const note =
        typeof share.note === "string" ? share.note.trim() : "";
      return {
        memberName: share.memberName.trim(),
        amount: fromCents(toCents(share.amount)),
        ...(note ? { note } : {}),
      };
    });

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

    if (group.isFinished === true) {
      return Response.json(
        { message: "Cannot add an expense to a finished tour." },
        { status: 409 },
      );
    }

    const expenseId = randomUUID();
    const transactionTime = new Date().toISOString();

    let savedExpense: Expense | null = null;
    let updatedGroup: Group | null = null;

    try {
      updatedGroup = await mutateGroup(id, (draft: Group) => {
        if (draft.isFinished === true) {
          throw new Error("FINISHED");
        }

        const members = draft.members ?? [];
        const memberNames = new Set(members.map((m) => m.name));

        if (
          !memberNames.has(payerName) ||
          shares.some((s) => !memberNames.has(s.memberName)) ||
          shares.length !== members.length
        ) {
          throw new Error("SHARES_MISMATCH");
        }

        const nextSequence = (draft.nextSequence ?? 0) + 1;

        const existingExpenses = (draft.expenses ?? []).map((item, i) => {
          const hasId = typeof item.id === "string" && item.id.length > 0;
          const hasCreatedAt =
            typeof item.createdAt === "string" &&
            item.createdAt.length > 0;
          const hasSequence =
            typeof item.sequence === "number" &&
            Number.isFinite(item.sequence);

          if (hasId && hasCreatedAt && hasSequence) return item;

          return {
            ...item,
            id: hasId ? item.id : randomUUID(),
            createdAt: hasCreatedAt
              ? item.createdAt
              : parseLegacyTime(item.time) ?? transactionTime,
            sequence: hasSequence ? item.sequence : i + 1,
          };
        });

        const expense: Expense = {
          id: expenseId,
          description,
          amount: fromCents(toCents(amount)),
          payerName,
          time,
          createdAt: transactionTime,
          sequence: nextSequence,
          shares,
        };

        draft.expenses = [...existingExpenses, expense];
        draft.nextSequence = nextSequence;
        savedExpense = expense;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "FINISHED") {
        return Response.json(
          { message: "Cannot add an expense to a finished tour." },
          { status: 409 },
        );
      }
      if (message === "SHARES_MISMATCH") {
        return Response.json(
          {
            message:
              "Shares must include every group member exactly once.",
          },
          { status: 400 },
        );
      }
      throw error;
    }

    return Response.json(
      {
        message: "Expense saved successfully.",
        expense: savedExpense,
        group: updatedGroup,
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