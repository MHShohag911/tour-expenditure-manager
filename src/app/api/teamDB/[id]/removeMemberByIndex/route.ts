import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "Tour-Expenditure-Management-Test-Test";
const COLLECTION_NAME = "TeamDB";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ExpenseRecord = {
  shares?: { memberName: string; amount: number }[];
};

type MemberRecord = {
  name: string;
  totalPaid: number;
  totalOwed: number;
};

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const rawIndex = searchParams.get("index");
    const index = Number(rawIndex);

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid group ID." },
        { status: 400 }
      );
    }

    if (
      rawIndex === null ||
      !Number.isInteger(index) ||
      index < 0
    ) {
      return NextResponse.json(
        { message: "Invalid member index." },
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

    const members = (group.members ?? []) as MemberRecord[];
    const expenses = (group.expenses ?? []) as ExpenseRecord[];

    if (index >= members.length) {
      return NextResponse.json(
        { message: "Member not found." },
        { status: 404 }
      );
    }

    /* if (members.length <= 1) {
      return NextResponse.json(
        { message: "Cannot delete the last member." },
        { status: 409 }
      );
    } */

    const targetMember = members[index];

    const hasShares = expenses.some((expense) =>
      expense.shares?.some(
        (share) => share.memberName === targetMember.name
      )
    );

    if (hasShares) {
      return NextResponse.json(
        {
          message: `${targetMember.name} has expense shares. Delete or reassign those expenses first.`,
        },
        { status: 409 }
      );
    }

    const remainingMembers = members.filter(
      (_, i) => i !== index
    );

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { members: remainingMembers } }
    );

    return NextResponse.json({
      message: "Member deleted.",
      members: remainingMembers,
    });
  } catch (error) {
    console.error("Failed to delete member:", error);

    return NextResponse.json(
      { message: "Failed to delete member." },
      { status: 500 }
    );
  }
}