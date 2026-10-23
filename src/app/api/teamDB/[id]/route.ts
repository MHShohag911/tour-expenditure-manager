
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  _request: Request,
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

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);

    const result = await db.collection(COLLECTION_NAME).deleteOne({
      _id: new ObjectId(id),
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Group deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete group:", error);

    return NextResponse.json(
      { message: "Failed to delete group." },
      { status: 500 }
    );
  }
}
