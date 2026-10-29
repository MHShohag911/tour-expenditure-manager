import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { mutateGroup } from "@/lib/accounting";
import type { Group } from "@/types/group";
import { randomUUID } from "crypto";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { fromMember, toMember, amount } = body;

    if (!ObjectId.isValid(id)) return NextResponse.json({ message: "Invalid group ID." }, { status: 400 });

    let updatedGroup: Group | null = null;

    try {
            updatedGroup = await mutateGroup(id, (draft: Group) => {
        if (draft.isFinished === true) {
          throw new Error("FINISHED");
        }
        if (draft.isLocked === true) {
          throw new Error("LOCKED");
        }

        const payer = draft.members.find((m) => m.name === fromMember);
        if (!payer) throw new Error("MEMBER_NOT_FOUND");
        if ((payer.accountBalance ?? 0) < amount) throw new Error("INSUFFICIENT_FUNDS");

        const nextSeq = (draft.nextSequence ?? 0) + 1;
        const now = new Date().toISOString();

        // Create a negative deposit for the payer, with a paidTo target
        draft.deposits = [...(draft.deposits ?? []), {
          id: randomUUID(),
          memberName: fromMember,
          amount: -amount,
          description: `Paid ${toMember}`,
          createdAt: now,
          sequence: nextSeq,
          paidTo: toMember,
        }];

        draft.nextSequence = nextSeq;
      });
        } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (msg === "FINISHED") {
        return NextResponse.json({ message: "Cannot settle a finished tour." }, { status: 409 });
      }
      if (msg === "LOCKED") {
        return NextResponse.json({ message: "Group is locked. Unlock it to settle debts." }, { status: 403 });
      }
      if (msg === "MEMBER_NOT_FOUND") {
        return NextResponse.json({ message: "Member not found." }, { status: 404 });
      }
      if (msg === "INSUFFICIENT_FUNDS") {
        return NextResponse.json({ message: "Insufficient A/C." }, { status: 400 });
      }
      throw error;
    }

    return NextResponse.json({ message: "Payment successful.", group: updatedGroup });
  } catch (error) {
    return NextResponse.json({ message: "Failed to settle payment." }, { status: 500 });
  }
}