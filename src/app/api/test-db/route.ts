
import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

export async function GET() {
  try {
    const client = await clientPromise;

    // Verify that MongoDB is reachable.
    await client.db("admin").command({ ping: 1 });

    // Check the database used by your project.
    const db = client.db("Tour-Expenditure-Management");
    const collections = await db.listCollections().toArray();

    return NextResponse.json({
      success: true,
      message: "MongoDB connected successfully!",
      database: "Tour-Expenditure-Management",
      collections: collections.map((collection) => collection.name),
    });
  } catch (error) {
    console.error("MongoDB connection test failed:", error);

    return NextResponse.json(
      {
        success: false,
        message: "MongoDB connection failed.",
      },
      { status: 500 },
    );
  }
}
