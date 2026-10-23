
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

// GET: Retrieve all groups
export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);

    const groups = await db
      .collection(COLLECTION_NAME)
      .find({})
      .sort({ _id: -1 })
      .toArray();

    return NextResponse.json(groups);
  } catch (error) {
    console.error("Failed to fetch groups:", error);

    return NextResponse.json(
      { message: "Failed to fetch groups." },
      { status: 500 },
    );
  }
}

// POST: Create a new group
export async function POST(request: Request) {
  try {
    const group = await request.json();

    if (
      !group ||
      typeof group.name !== "string" ||
      !group.name.trim()
    ) {
      return NextResponse.json(
        { message: "A valid group name is required." },
        { status: 400 },
      );
    }

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);

    const result = await db
      .collection(COLLECTION_NAME)
      .insertOne(group);

    return NextResponse.json(
      {
        acknowledged: result.acknowledged,
        insertedId: result.insertedId.toString(),
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create group:", error);

    return NextResponse.json(
      { message: "Failed to create group." },
      { status: 500 },
    );
  }
}
