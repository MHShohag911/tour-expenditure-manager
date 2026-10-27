import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { mutateGroup } from "@/lib/accounting";
import type { Group } from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management";
const COLLECTION_NAME = "TeamDB";

type GroupDocument = {
  name?: string;
  isDisabled?: boolean;
};

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
  request: Request,
  { params }: RouteContext,
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid group ID." },
        { status: 400 },
      );
    }

    const member = await request.json();

    if (
      typeof member.name !== "string" ||
      !member.name.trim()
    ) {
      return NextResponse.json(
        { message: "Invalid member data." },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);
    const collection = db.collection<GroupDocument>(COLLECTION_NAME);

    const existing = await collection.findOne({
      _id: new ObjectId(id),
    });

    if (!existing) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 },
      );
    }

    if (existing.isDisabled === true) {
      return NextResponse.json(
        { message: "Cannot add members after the group is set." },
        { status: 409 },
      );
    }

    const trimmedName = member.name.trim();
    let added = false;
    let updatedGroup: Group | null = null;

    try {
      updatedGroup = await mutateGroup(id, (draft: Group) => {
        if (draft.isDisabled === true) {
          throw new Error("DISABLED");
        }

        const members = draft.members ?? [];

        if (
          members.some(
            (m) =>
              m.name.toLowerCase() === trimmedName.toLowerCase(),
          )
        ) {
          throw new Error("DUPLICATE");
        }

        draft.members = [
          ...members,
          {
            name: trimmedName,
            totalPaid: 0,
            totalOwed: 0,
            accountBalance: 0,
            accountTransactions: [],
          },
        ];
        added = true;
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "DISABLED") {
        return NextResponse.json(
          { message: "Cannot add members after the group is set." },
          { status: 409 },
        );
      }
      if (message === "DUPLICATE") {
        return NextResponse.json(
          { message: "Member already exists." },
          { status: 409 },
        );
      }
      throw error;
    }

    return NextResponse.json({
      message: "Member added.",
      added,
      group: updatedGroup,
    });
  } catch (error) {
    console.error("Failed to add member:", error);

    return NextResponse.json(
      { message: "Failed to add member." },
      { status: 500 },
    );
  }
}