import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { Group } from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

type RouteContext = {
  params: Promise<{ id: string; name: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  try {
    const { id, name } = await params;
    const memberName = decodeURIComponent(name);
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: "Invalid group ID." }, { status: 400 });
    }

    if (!["transactions", "shared", "debts", "deposits", "expenses_paid"].includes(type || "")) {
      return NextResponse.json({ message: "Invalid section type." }, { status: 400 });
    }

    const client = await clientPromise;
    const group = await client
      .db(DATABASE_NAME)
      .collection<Group>(COLLECTION_NAME)
      .findOne({ _id: new ObjectId(id) as unknown as string });

    if (!group) {
      return NextResponse.json({ message: "Group not found." }, { status: 404 });
    }

    const member = (group.members ?? []).find((m) => m.name === memberName);

    if (!member) {
      return NextResponse.json({ message: "Member not found." }, { status: 404 });
    }

    if (type === "transactions") {
      const transactions = [...(member.accountTransactions ?? [])].sort(
        (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)
      );
      return NextResponse.json({ transactions });
    }

    if (type === "shared") {
      const expensesSharedIn = (group.expenses ?? []).filter((e) =>
        (e.shares ?? []).some((s) => s.memberName === member.name)
      );
      const data = expensesSharedIn.map((e) => {
        const myShare = (e.shares ?? []).find((s) => s.memberName === member.name);
        return {
          id: e.id,
          description: e.description,
          payerName: e.payerName,
          time: e.time,
          myShare: myShare?.amount ?? 0,
          note: myShare?.note,
        };
      });
      return NextResponse.json({ shared: data });
    }

    if (type === "debts") {
      const myDebts = (group.outstandingDebts ?? []).filter(
        (d) => d.fromMember === member.name || d.toMember === member.name
      );
      return NextResponse.json({ debts: myDebts });
    }

    if (type === "deposits") {
      const myDeposits = (group.deposits ?? []).filter(
        (d) => d.memberName === member.name
      );
      return NextResponse.json({ deposits: myDeposits });
    }

    if (type === "expenses_paid") {
      const expensesPaid = (group.expenses ?? []).filter((e) => e.payerName === member.name);
      const data = expensesPaid.map((e) => ({
        id: e.id,
        description: e.description,
        amount: e.amount,
        time: e.time,
      }));
      return NextResponse.json({ expenses_paid: data });
    }

    return NextResponse.json({ message: "Unknown section." }, { status: 400 });
  } catch (error) {
    console.error("Failed to fetch member section:", error);
    return NextResponse.json({ message: "Failed to fetch section." }, { status: 500 });
  }
}