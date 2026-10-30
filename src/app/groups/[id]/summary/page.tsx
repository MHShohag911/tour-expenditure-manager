import Link from "next/link";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
import type { Group } from "@/types/group";
import Image from "next/image";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

type PageProps = {
  params: Promise<{ id: string }>;
};

const fmt = (n: number) => n.toFixed(2);

export default async function SummaryPage({ params }: PageProps) {
  const { id } = await params;

  if (!ObjectId.isValid(id)) {
    return <div className="p-6 text-red-600">Invalid group ID.</div>;
  }

  const client = await clientPromise;
  const group = await client
    .db(DATABASE_NAME)
    .collection<Group>(COLLECTION_NAME)
    .findOne({ _id: new ObjectId(id) as unknown as string });

  if (!group) {
    return <div className="p-6 text-red-600">Group not found.</div>;
  }

  const expenses = group.expenses ?? [];

  // Calculate dates
  let dateRange = "No dates";
  let totalDays = 0;
  if (expenses.length > 0) {
    const dates = expenses.map(
      (e) => new Date(e.createdAt || new Date(e.time).toISOString()),
    );
    const minDate = new Date(Math.min(...dates.map((d) => d.getTime())));
    const maxDate = new Date(Math.max(...dates.map((d) => d.getTime())));
    const fmtDate = (d: Date) =>
      d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    dateRange = `${fmtDate(minDate)} - ${fmtDate(maxDate)}`;
    totalDays = Math.max(
      1,
      Math.ceil(
        (maxDate.getTime() - minDate.getTime()) / (1000 * 60 * 60 * 24),
      ),
    );
  }
  const now = new Date();
  const generatedDate = now.toLocaleString("en-GB", {
    timeZone: "Asia/Dhaka",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const totalSpend = expenses.reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      {/* Top Action Bar */}
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-bold text-[#1DD100] hover:text-gray-900"
        >
          ← Back
        </Link>
        <a
          href={`/api/teamDB/${group._id}/export`}
          target="_blank"
          className="rounded-md bg-[#1DD100] px-5 py-2 text-sm font-semibold text-white transition hover:bg-[#19B300]"
        >
          Download PDF
        </a>
      </div>

      {/* Main Report Card */}
      <div className="md:relative rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        {/* Logo in the top right corner */}
        <div className="mb-4 flex justify-center items-center md:absolute md:right-8 md:top-8">
          <div className="">
            <Image
            src="https://i.ibb.co.com/HLJN8qFp/logo.png" // Or use "/logo.png" if it's in the public folder
            alt="TEM Logo"
            width={50}
            height={50}
            className="object-contain"
          />
          <p className="text-center text-x font-bold text-gray-900" >TEM</p>
          </div>
        </div>

        {/* Centered Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold">
            <span className="text-[#1DD100]">{group.name}</span>
            <span className="text-black"> - Tour Summary</span>
          </h1>
          <p className="mt-2 text-sm text-gray-900 font-medium">
            Dates: {dateRange} ({totalDays} days)
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Generated on: {generatedDate}
          </p>
        </div>

        <hr className="border-t-2 border-dashed border-[#1DD100] my-3" />
        {/* Totals */}
        <div className="mt-4 gap-8 text-sm">
          <div className="flex">
            <p className="text-gray-600 font-bold">
              Total Members:{" "}
              <span className="text-black">{group.members.length}</span>
            </p>
            <p className="font-bold"></p>
          </div>
          <div>
            <p className="text-gray-600 font-bold">
              Total Expenses:{" "}
              <span className="text-black">{expenses.length}</span>
            </p>
          </div>
          <div>
            <p className="text-gray-600 font-bold">
              Total Spend:{" "}
              <span className="text-black">৳ {fmt(totalSpend)}</span>
            </p>
          </div>
        </div>

        <hr className="border-t-2 border-dashed border-[#1DD100] my-3" />
        {/* Member Summary */}
        <h2 className="mt-5 text-xl font-bold">Member Summary</h2>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-6 ">
          {group.members.map((member) => {
            const net = member.totalPaid - member.totalOwed;
            const isSettled = Math.abs(net) < 0.005;
            const isCreditor = net > 0;

            return (
              <div key={member.name}>
                <p className="font-bold text-black">{member.name}</p>

                <div className="mt-2 space-y-1 text-xs">
                  <p>
                    <span className="text-gray-900 font-bold">Paid: </span>
                    <span className="font-bold text-[#1DD100]">
                      ৳ {fmt(member.totalPaid)}
                    </span>
                  </p>
                  <p>
                    <span className="text-gray-900 font-bold">Share: </span>
                    <span className="font-bold text-red-600">
                      ৳ {fmt(member.totalOwed)}
                    </span>
                  </p>
                </div>

                <p className="mt-2 text-xs font-bold text-gray-900">
                  {isSettled ? (
                    <span className="text-gray-600">Settled</span>
                  ) : isCreditor ? (
                    <>
                      Gets Back{" "}
                      <span className="text-[#1DD100]">৳ {fmt(net)}</span>
                    </>
                  ) : (
                    <>
                      Pay <span className="text-red-600">৳ {fmt(-net)}</span>
                    </>
                  )}
                </p>
              </div>
            );
          })}
        </div>

        <hr className="border-t-2 border-dashed border-[#1DD100] my-3" />

        {/* Expense List */}
        <h2 className="mt-5 text-xl font-bold">Expense Details</h2>
        <div className="mt-4 space-y-3">
          {expenses.map((expense, index) => {
            const eDate = expense.createdAt
              ? new Date(expense.createdAt).toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                })
              : expense.time;

            return (
              <div key={expense.id || index} className="text-sm">
                <p className="font-medium text-black">
                  {index + 1}. {expense.description} - ৳ {fmt(expense.amount)}{" "}
                  (Paid by {expense.payerName})
                </p>
                <p className="text-xs text-gray-500">{eDate}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
