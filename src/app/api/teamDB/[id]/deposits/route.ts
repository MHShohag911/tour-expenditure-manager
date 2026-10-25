import { ObjectId, type Document } from "mongodb";
import { randomUUID } from "crypto";
import clientPromise from "@/lib/mongodb";
import { mutateGroup, toCents } from "@/lib/accounting";
import type { Deposit, Group } from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

type GroupDocument = Document & {
  isFinished?: boolean;
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

    const client = await clientPromise;
    const collection = client
      .db(DATABASE_NAME)
      .collection<GroupDocument>(COLLECTION_NAME);

    const group = await collection.findOne({
      _id: new ObjectId(id),
    });

    if (!group) {
      return Response.json(
        { message: "Group not found." },
        { status: 404 },
      );
    }

    if (group.isFinished === true) {
      return Response.json(
        { message: "Cannot add a deposit to a finished tour." },
        { status: 409 },
      );
    }

    const depositId = randomUUID();
    const depositTime = new Date().toISOString();
    let savedDeposit: Deposit | null = null;

    try {
      await mutateGroup(id, (draft: Group) => {
        if (draft.isFinished === true) {
          throw new Error("FINISHED");
        }

        const members = draft.members ?? [];
        if (!members.some((m) => m.name === memberName)) {
          throw new Error("MEMBER_NOT_FOUND");
        }

        const nextSequence = (draft.nextSequence ?? 0) + 1;

        const deposit: Deposit = {
          id: depositId,
          memberName,
          amount,
          description,
          createdAt: depositTime,
          sequence: nextSequence,
        };

        draft.deposits = [...(draft.deposits ?? []), deposit];
        draft.nextSequence = nextSequence;
        savedDeposit = deposit;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "FINISHED") {
        return Response.json(
          { message: "Cannot add a deposit to a finished tour." },
          { status: 409 },
        );
      }
      if (message === "MEMBER_NOT_FOUND") {
        return Response.json(
          { message: "Member not found." },
          { status: 404 },
        );
      }
      throw error;
    }

    return Response.json(
      {
        message: "Deposit added.",
        deposit: savedDeposit,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to add deposit:", error);

    return Response.json(
      { message: "Failed to add deposit." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const depositId = searchParams.get("depositId");

    if (!ObjectId.isValid(id)) {
      return Response.json(
        { message: "Invalid group ID." },
        { status: 400 },
      );
    }

    if (!depositId) {
      return Response.json(
        { message: "Missing deposit ID." },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const collection = client
      .db(DATABASE_NAME)
      .collection<GroupDocument>(COLLECTION_NAME);

    const group = await collection.findOne({
      _id: new ObjectId(id),
    });

    if (!group) {
      return Response.json(
        { message: "Group not found." },
        { status: 404 },
      );
    }

    if (group.isFinished === true) {
      return Response.json(
        { message: "Cannot delete a deposit from a finished tour." },
        { status: 409 },
      );
    }

    let found = false;

    try {
      await mutateGroup(id, (draft: Group) => {
        if (draft.isFinished === true) {
          throw new Error("FINISHED");
        }

        const deposits = draft.deposits ?? [];
        if (!deposits.some((d) => d.id === depositId)) {
          throw new Error("DEPOSIT_NOT_FOUND");
        }

        found = true;
        draft.deposits = deposits.filter((d) => d.id !== depositId);
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "FINISHED") {
        return Response.json(
          { message: "Cannot delete a deposit from a finished tour." },
          { status: 409 },
        );
      }
      if (message === "DEPOSIT_NOT_FOUND") {
        return Response.json(
          { message: "Deposit not found." },
          { status: 404 },
        );
      }
      throw error;
    }

    return Response.json({
      message: "Deposit deleted.",
      deleted: found,
    });
  } catch (error) {
    console.error("Failed to delete deposit:", error);

    return Response.json(
      { message: "Failed to delete deposit." },
      { status: 500 },
    );
  }
}