
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "Tour-Expenditure-Management";
const COLLECTION_NAME = "TeamDB";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PUT(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid group ID." },
        { status: 400 }
      );
    }

    const updatedGroup = await request.json();

    const { name, members, expenses, extraCharges, isDisabled } =
      updatedGroup;

    if (
      typeof name !== "string" ||
      !Array.isArray(members) ||
      !Array.isArray(expenses) ||
      !Array.isArray(extraCharges) ||
      typeof isDisabled !== "boolean"
    ) {
      return NextResponse.json(
        { message: "Invalid group data." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);

    const result = await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name,
          members,
          expenses,
          extraCharges,
          isDisabled,
        },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      acknowledged: result.acknowledged,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Failed to update group:", error);

    return NextResponse.json(
      { message: "Failed to update group." },
      { status: 500 }
    );
  }
}
