import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcrypt";
import type { Group } from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function DELETE(
  request: Request,
  { params }: RouteContext
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const password = searchParams.get("password");

    if (!ObjectId.isValid(id)) {
      return NextResponse.json(
        { message: "Invalid group ID." },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DATABASE_NAME);
    const collection = db.collection<Omit<Group, "_id"> & { _id: ObjectId }>(COLLECTION_NAME);

    const group = await collection.findOne({ _id: new ObjectId(id) });

    if (!group) {
      return NextResponse.json(
        { message: "Group not found." },
        { status: 404 }
      );
    }

    // If the group has a lock, verify the password before deleting
    if (group.lockHash) {
      if (!password) {
        return NextResponse.json(
          { message: "Password required to delete this locked group." },
          { status: 401 }
        );
      }

      const isValid = await bcrypt.compare(password, group.lockHash);

      if (!isValid) {
        return NextResponse.json(
          { message: "Incorrect password." },
          { status: 401 }
        );
      }
    }

    const result = await collection.deleteOne({
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