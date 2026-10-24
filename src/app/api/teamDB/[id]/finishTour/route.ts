import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "Tour-Expenditure-Management";
const COLLECTION_NAME = "TeamDB";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(
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

    if (group.isFinished === true) {
      return NextResponse.json(
        { message: "Tour is already finished." },
        { status: 409 }
      );
    }

    if (!Array.isArray(group.members) || group.members.length < 2) {
      return NextResponse.json(
        { message: "Add at least two members before finishing the tour." },
        { status: 400 }
      );
    }

    await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { isFinished: true } }
    );

    return NextResponse.json({
      message: "Tour finished.",
      isFinished: true,
    });
  } catch (error) {
    console.error("Failed to finish tour:", error);

    return NextResponse.json(
      { message: "Failed to finish tour." },
      { status: 500 }
    );
  }
}