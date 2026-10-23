
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

type Member = {
  name: string;
  totalPaid: number;
  totalOwed: number;
};

type GroupDocument = {
  name?: string;
  members: Member[];
  expenses?: unknown[];
  extraCharges?: unknown[];
  isDisabled?: boolean;
};

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

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
      !member.name.trim() ||
      typeof member.totalPaid !== "number" ||
      typeof member.totalOwed !== "number"
    ) {
      return NextResponse.json(
        { message: "Invalid member data." },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);
    const collection = db.collection<GroupDocument>(COLLECTION_NAME);

    const result = await collection.updateOne(
  { _id: new ObjectId(id) },
  {
    $push: {
      members: {
        name: member.name.trim(),
        totalPaid: member.totalPaid,
        totalOwed: member.totalOwed,
      },
    },
  }
);

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      acknowledged: result.acknowledged,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Failed to add member:", error);

    return NextResponse.json(
      { message: "Failed to add member." },
      { status: 500 },
    );
  }
}
