
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "Tour-Expenditure-Management";
const COLLECTION_NAME = "TeamDB";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ExpenseRecord = {
  description: string;
  amount: number;
  payerName: string;
  time: string;
  shares?: {
    memberName: string;
    amount: number;
  }[];
};

type MemberRecord = {
  name: string;
  totalPaid: number;
  totalOwed: number;
};

type ExtraChargeRecord = {
  extraAmount: number;
  paidBy: string;
  owedBy: string;
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
        { message: "Invalid expense index." },
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

    const expenses = (group.expenses ?? []) as ExpenseRecord[];
    const members = (group.members ?? []) as MemberRecord[];
    const extraCharges = (group.extraCharges ?? []) as ExtraChargeRecord[];

    if (index >= expenses.length) {
      return NextResponse.json(
        { message: "Expense not found." },
        { status: 404 }
      );
    }

    // Remove the selected expense.
    const remainingExpenses = expenses.filter(
      (_, i) => i !== index
    );

    // Recalculate every member's balances.
    const updatedMembers = members.map((member) => {
      const totalPaidFromExpenses = remainingExpenses.reduce(
        (total, expense) =>
          expense.payerName === member.name
            ? total + Number(expense.amount)
            : total,
        0
      );

      const totalOwedFromExpenses = remainingExpenses.reduce(
        (total, expense) => {
          // Use saved individual shares when available.
          if (expense.shares && expense.shares.length > 0) {
            const memberShare = expense.shares.find(
              (share) => share.memberName === member.name
            );

            return total + Number(memberShare?.amount ?? 0);
          }

          // Legacy expenses without shares use equal splitting.
          if (members.length === 0) {
            return total;
          }

          return total + Number(expense.amount) / members.length;
        },
        0
      );

      // Preserve extra-charge contributions.
      const totalPaidFromExtraCharges = extraCharges.reduce(
        (total, charge) =>
          charge.paidBy === member.name
            ? total + Number(charge.extraAmount)
            : total,
        0
      );

      const totalOwedFromExtraCharges = extraCharges.reduce(
        (total, charge) =>
          charge.owedBy === member.name
            ? total + Number(charge.extraAmount)
            : total,
        0
      );

      return {
        ...member,
        totalPaid:
          totalPaidFromExpenses + totalPaidFromExtraCharges,
        totalOwed:
          totalOwedFromExpenses + totalOwedFromExtraCharges,
      };
    });

    await collection.updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          expenses: remainingExpenses,
          members: updatedMembers,
        },
      }
    );

    return NextResponse.json({
      message: "Expense deleted and balances recalculated.",
      expenses: remainingExpenses,
      members: updatedMembers,
    });
  } catch (error) {
    console.error("Failed to delete expense:", error);

    return NextResponse.json(
      { message: "Failed to delete expense." },
      { status: 500 }
    );
  }
}
