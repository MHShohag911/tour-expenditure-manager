import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcrypt";
import type { Group } from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

export async function POST(
    request: Request,
    { params }: { params: Promise<{ id: string }> },
) {
    try {
        const { id } = await params;

        if (!ObjectId.isValid(id)) {
            return NextResponse.json({ message: "Invalid group ID." }, { status: 400 });
        }

        const body = await request.json();
        const { action, password } = body;

        // Validate 6-digit password format if provided
        if (password && (typeof password !== "string" || !/^\d{6}$/.test(password))) {
            return NextResponse.json(
                { message: "Password must be exactly 6 digits." },
                { status: 400 },
            );
        }

        const client = await clientPromise;
        const collection = client
            .db(DATABASE_NAME)
            .collection<Omit<Group, "_id"> & { _id: ObjectId }>(COLLECTION_NAME);

        const group = await collection.findOne({ _id: new ObjectId(id) });

        if (!group) {
            return NextResponse.json({ message: "Group not found." }, { status: 404 });
        }

        if (action === "lock") {
            if (!group.lockHash) {
                return NextResponse.json({ message: "No password set. Cannot lock." }, { status: 400 });
            }

            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isLocked: true } },
            );

            return NextResponse.json({ message: "Group locked successfully." });
        }

        if (action === "set") {
            if (!password) {
                return NextResponse.json({ message: "Password is required." }, { status: 400 });
            }
            if (group.isLocked) {
                return NextResponse.json({ message: "Group is already locked." }, { status: 400 });
            }

            const hash = await bcrypt.hash(password, 10);

            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isLocked: true, lockHash: hash } },
            );

            return NextResponse.json({ message: "Group locked successfully." });
        }

        if (action === "unlock") {
            if (!password) {
                return NextResponse.json({ message: "Password is required." }, { status: 400 });
            }
            if (!group.isLocked || !group.lockHash) {
                return NextResponse.json({ message: "Group is not locked." }, { status: 400 });
            }

            const isValid = await bcrypt.compare(password, group.lockHash);

            if (!isValid) {
                return NextResponse.json({ message: "Incorrect password." }, { status: 401 });
            }

            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isLocked: false } },
            );

            return NextResponse.json({ message: "Group unlocked successfully." });
        }

        if (action === "delete") {
            if (!password) {
                return NextResponse.json({ message: "Password is required." }, { status: 400 });
            }
            if (!group.lockHash) {
                return NextResponse.json({ message: "No lock exists on this group." }, { status: 400 });
            }

            const isValid = await bcrypt.compare(password, group.lockHash);

            if (!isValid) {
                return NextResponse.json({ message: "Incorrect password." }, { status: 401 });
            }

            await collection.updateOne(
                { _id: new ObjectId(id) },
                { $set: { isLocked: false }, $unset: { lockHash: "" } },
            );

            return NextResponse.json({ message: "Lock removed successfully." });
        }

        return NextResponse.json({ message: "Invalid action." }, { status: 400 });
    } catch (error) {
        console.error("Failed to manage lock:", error);
        return NextResponse.json(
            { message: "Failed to manage lock." },
            { status: 500 },
        );
    }
}