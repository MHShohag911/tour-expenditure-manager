import Link from "next/link";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import MemberSection from "@/components/MemberSection";
import type { Group } from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

type PageProps = {
  params: Promise<{ id: string; name: string }>;
};

const fmt = (n: number) =>
  n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export default async function MemberPage({ params }: PageProps) {
  const { id, name } = await params;
  const memberName = decodeURIComponent(name);

  if (!ObjectId.isValid(id)) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600">Invalid group ID.</p>
      </div>
    );
  }

  const client = await clientPromise;

  // Fetch only the summary data using aggregation to keep the payload small
  const group = (await client
    .db(DATABASE_NAME)
    .collection<Group>(COLLECTION_NAME)
    .aggregate([
      { $match: { _id: new ObjectId(id) } },
      {
        $addFields: {
          totalDepositsForMember: {
            $reduce: {
              input: { $ifNull: ["$deposits", []] },
              initialValue: 0,
              in: {
                $cond: [
                  { $eq: ["$$this.memberName", memberName] },
                  { $add: ["$$value", "$$this.amount"] },
                  "$$value",
                ],
              },
            },
          },
        },
      },
      {
        $project: {
          expenses: 0,
          deposits: 0,
          outstandingDebts: 0,
          settlements: 0,
          "members.accountTransactions": 0,
        },
      },
    ])
    .next()) as (Group & { totalDepositsForMember?: number }) | null;

  if (!group) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600">Group not found.</p>
      </div>
    );
  }

  const member = (group.members ?? []).find((m) => m.name === memberName);

  if (!member) {
    return (
      <div className="container mx-auto p-6">
        <p className="text-red-600">Member not found in this group.</p>
        <Link href="/" className="mt-4 inline-block text-blue-600 underline">
          Back to groups
        </Link>
      </div>
    );
  }

  // Since we excluded outstandingDebts and accountTransactions, the Net
  // calculation falls back to the gross tour totals.
  const net = member.totalPaid - member.totalOwed;

  // These totals were calculated by the aggregation pipeline above
  const totalDeposits = group.totalDepositsForMember || 0;

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Link href="/" className="text-sm text-blue-600 underline">
        ← Back
      </Link>

      <h1 className="mt-4 text-3xl font-bold text-black">{member.name}</h1>
      <p className="text-gray-600">in {group.name}</p>

      <section className="mt-6 grid grid-cols-2 gap-4 rounded-xl border bg-white p-5 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase text-gray-500">Total Paid</p>
          <p className="text-lg font-semibold text-gray-900">
            ৳{fmt(member.totalPaid)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Total Owed</p>
          <p className="text-lg font-semibold text-gray-900">
            ৳{fmt(member.totalOwed)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Total Deposits</p>
          <p className="text-lg font-semibold text-indigo-700">
            ৳{fmt(totalDeposits)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">A/C Balance</p>
          <p className="text-lg font-semibold text-blue-700">
            ৳{fmt(member.accountBalance ?? 0)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase text-gray-500">Net Tour Balance</p>
          <p
            className={`text-lg font-semibold ${Math.abs(net) < 0.005 ? "text-gray-600" : net > 0 ? "text-green-600" : "text-red-600"}`}
          >
            {Math.abs(net) < 0.005
              ? "Even"
              : net > 0
                ? `Will Get ৳${fmt(net)}`
                : `Will Pay ৳${fmt(-net)}`}
          </p>
        </div>
      </section>

      {/* Lazy-loaded sections */}
      <div className="mt-4">
        <MemberSection
          groupId={id}
          memberName={memberName}
          type="expenses_paid"
          title="Expenses Paid"
        />
        <MemberSection
          groupId={id}
          memberName={memberName}
          type="shared"
          title="Shared Expenses"
        />
        <MemberSection
          groupId={id}
          memberName={memberName}
          type="deposits"
          title="Deposits"
        />
        <MemberSection
          groupId={id}
          memberName={memberName}
          type="transactions"
          title="A/C Transactions"
        />
        <MemberSection
          groupId={id}
          memberName={memberName}
          type="debts"
          title="Debts"
        />
      </div>
    </div>
  );
}
