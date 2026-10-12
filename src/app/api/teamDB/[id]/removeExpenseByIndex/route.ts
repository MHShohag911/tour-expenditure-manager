
import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";

const DATABASE_NAME = "Tour-Expenditure-Management";
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

    const expenses = group.expenses ?? [];
    const members = group.members ?? [];
    const extraCharges = group.extraCharges ?? [];

    if (index >= expenses.length) {
      return NextResponse.json(
        { message: "Expense not found." },
        { status: 404 }
      );
    }

    // Remove the selected expense.
    const remainingExpenses = expenses.filter(
      (_: unknown, i: number) => i !== index
    );

    // Recalculate balances from the remaining expenses.
    const updatedMembers = members.map(
      (member: {
        name: string;
        totalPaid: number;
        totalOwed: number;
      }) => {
        const totalPaidFromExpenses =
          remainingExpenses.reduce(
            (
              total: number,
              expense: {
                amount: number;
                payerName: string;
              }
            ) =>
              expense.payerName === member.name
                ? total + Number(expense.amount)
                : total,
            0
          );

        const totalOwedFromExpenses =
          members.length > 0
            ? remainingExpenses.reduce(
                (total: number, expense: { amount: number }) =>
                  total + Number(expense.amount),
                0
              ) / members.length
            : 0;

        // Keep extra-charge contributions in the balances.
        const totalPaidFromExtraCharges =
          extraCharges.reduce(
            (
              total: number,
              charge: { extraAmount: number; paidBy: string }
            ) =>
              charge.paidBy === member.name
                ? total + Number(charge.extraAmount)
                : total,
            0
          );

        const totalOwedFromExtraCharges =
          extraCharges.reduce(
            (
              total: number,
              charge: { extraAmount: number; owedBy: string }
            ) =>
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
      }
    );

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
