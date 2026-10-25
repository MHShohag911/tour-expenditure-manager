import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import { mutateGroup } from "@/lib/accounting";
import type { Group, Member } from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

type RouteContext = {
    params: Promise<{ id: string }>;
};

type ExpenseRecord = {
    shares?: { memberName: string; amount: number }[];
};

type MemberRecord = Member;

type GroupRecord = {
  members?: MemberRecord[];
  expenses?: ExpenseRecord[];
  deposits?: { memberName?: string }[];
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
            .collection<GroupRecord>(COLLECTION_NAME);

        const group = await collection.findOne({
            _id: new ObjectId(id),
        });

        if (!group) {
            return NextResponse.json(
                { message: "Group not found." },
                { status: 404 }
            );
        }

        const members = group.members ?? [];
        const expenses = group.expenses ?? [];

        if (index >= members.length) {
            return NextResponse.json(
                { message: "Member not found." },
                { status: 404 }
            );
        }

        const targetMember = members[index];

        const hasShares = expenses.some((expense) =>
            expense.shares?.some(
                (share) => share.memberName === targetMember.name
            )
        );

        const hasDeposits = (group.deposits ?? []).some(
            (deposit: { memberName?: string }) =>
                deposit.memberName === targetMember.name
        );

        if (hasShares || hasDeposits) {
            return NextResponse.json(
                {
                    message: `${targetMember.name} has expense shares or deposits. Delete or reassign them first.`,
                },
                { status: 409 }
            );
        }

        let remainingMembers: MemberRecord[] = [];

        try {
            await mutateGroup(id, (draft: Group) => {
                const draftMembers = draft.members ?? [];
                const found = draftMembers.findIndex(
                    (m) => m.name === targetMember.name
                );

                if (found === -1) {
                    throw new Error("MEMBER_NOT_FOUND");
                }

                remainingMembers = draftMembers.filter(
                    (m) => m.name !== targetMember.name
                );

                draft.members = remainingMembers;
            });
        } catch (error) {
            const message = error instanceof Error ? error.message : "";
            if (message === "MEMBER_NOT_FOUND") {
                return NextResponse.json(
                    { message: "Member not found." },
                    { status: 404 }
                );
            }
            throw error;
        }

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