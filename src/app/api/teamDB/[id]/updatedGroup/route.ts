
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
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

    const body = await request.json();

    if (!Array.isArray(body.members)) {
      return NextResponse.json(
        { message: "A valid members array is required." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);

    const result = await db.collection(COLLECTION_NAME).updateOne(
      { _id: new ObjectId(id) },
      { $set: { members: body.members } }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Group members updated successfully.",
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("Failed to update group members:", error);

    return NextResponse.json(
      { message: "Failed to update group members." },
      { status: 500 }
    );
  }
}
