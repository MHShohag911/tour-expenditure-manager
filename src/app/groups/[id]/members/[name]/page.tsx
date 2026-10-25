import Link from "next/link";
import { ObjectId } from "mongodb";
import clientPromise from "@/lib/mongodb";
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
    const group = await client
        .db(DATABASE_NAME)
        .collection<Group>(COLLECTION_NAME)
        .findOne({ _id: new ObjectId(id) as unknown as string });

    if (!group) {
        return (
            <div className="container mx-auto p-6">
                <p className="text-red-600">Group not found.</p>
            </div>
        );
    }

    const member = (group.members ?? []).find(
        (m) => m.name === memberName
    );

    if (!member) {
        return (
            <div className="container mx-auto p-6">
                <p className="text-red-600">Member not found in this group.</p>
                <Link
                    href="/"
                    className="mt-4 inline-block text-blue-600 underline"
                >
                    Back to groups
                </Link>
            </div>
        );
    }

    const owedToThem = member.accountCreditBalance ?? 0;
    const stillOwesOthers = (group.outstandingDebts ?? [])
        .filter((d) => d.fromMember === member.name)
        .reduce(
            (sum, d) => sum + (d.originalAmount - d.settledAmount),
            0
        );
    const net = owedToThem - stillOwesOthers;

    const expensesPaidByHim = (group.expenses ?? []).filter(
        (e) => e.payerName === member.name
    );

    const expensesSharedIn = (group.expenses ?? []).filter((e) =>
        (e.shares ?? []).some((s) => s.memberName === member.name)
    );

    const totalDeposits = (group.deposits ?? [])
        .filter((d) => d.memberName === member.name)
        .reduce((sum, d) => sum + d.amount, 0);

    const myDeposits = (group.deposits ?? []).filter(
        (d) => d.memberName === member.name
    );

    const myDebts = (group.outstandingDebts ?? []).filter(
        (d) =>
            d.fromMember === member.name || d.toMember === member.name
    );

    const transactions = [...(member.accountTransactions ?? [])].sort(
        (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)
    );

    const totalPaidByHim = expensesPaidByHim.reduce(
        (sum, e) => sum + e.amount,
        0
    );

    const totalHisSharesOfPaidByHim = expensesPaidByHim.reduce(
        (sum, e) => {
            const s = (e.shares ?? []).find(
                (sh) => sh.memberName === member.name
            );
            return sum + (s?.amount ?? 0);
        },
        0
    );

    const totalHisSharesOfAll = expensesSharedIn.reduce((sum, e) => {
        const s = (e.shares ?? []).find(
            (sh) => sh.memberName === member.name
        );
        return sum + (s?.amount ?? 0);
    }, 0);

    return (
        <div className="container mx-auto max-w-4xl px-4 py-8">
            <Link href="/" className="text-sm text-blue-600 underline">
                ← Back
            </Link>

            <h1 className="mt-4 text-3xl font-bold text-black">
                {member.name}
            </h1>
            <p className="text-gray-600">in {group.name}</p>

            <section className="mt-6 grid grid-cols-2 gap-4 rounded-xl border bg-white p-5 md:grid-cols-4">
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
                    <p className="text-xs uppercase text-gray-500">
                        Total Deposits
                    </p>
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
                    <p className="text-xs uppercase text-gray-500">Owed to him</p>
                    <p className="text-lg font-semibold text-amber-700">
                        ৳{fmt(owedToThem)}
                    </p>
                </div>
                <div>
                    <p className="text-xs uppercase text-gray-500">
                        Still Owes Others
                    </p>
                    <p className="text-lg font-semibold text-red-700">
                        ৳{fmt(stillOwesOthers)}
                    </p>
                </div>
                <div>
                    <p className="text-xs uppercase text-gray-500">Net</p>
                    <p
                        className={`text-lg font-semibold ${Math.abs(net) < 0.005
                                ? "text-gray-600"
                                : net > 0
                                    ? "text-green-600"
                                    : "text-red-600"
                            }`}
                    >
                        {Math.abs(net) < 0.005
                            ? "Settled"
                            : net > 0
                                ? `Will Get ৳${fmt(net)}`
                                : `Will Pay ৳${fmt(-net)}`}
                    </p>
                </div>
            </section>

            <section className="mt-8">
                <h2 className="mb-3 text-xl font-bold text-black">
                    A/C Transactions
                </h2>
                {transactions.length === 0 ? (
                    <p className="text-gray-500">No A/C transactions yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {transactions.map((t) => (
                            <li
                                key={t.id}
                                className="rounded-lg border bg-white p-3 text-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-800">
                                        {t.type.replace(/_/g, " ")}
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                        ৳{fmt(t.amount)}
                                    </span>
                                </div>
                                <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                                    <span>{t.description}</span>
                                    <span>A/C after: ৳{fmt(t.balanceAfter ?? 0)}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="mt-8">
                <h2 className="mb-3 text-xl font-bold text-black">
                    Expenses paid by him ({expensesPaidByHim.length})
                </h2>
                <p className="mb-3 text-sm text-gray-600">
                    Total: ৳{fmt(totalPaidByHim)} — his shares: ৳
                    {fmt(totalHisSharesOfPaidByHim)}
                </p>
                {expensesPaidByHim.length === 0 ? (
                    <p className="text-gray-500">
                        This member has not paid any expenses.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {expensesPaidByHim.map((e) => {
                            const myShare = (e.shares ?? []).find(
                                (s) => s.memberName === member.name
                            );
                            return (
                                <li
                                    key={e.id ?? `${e.description}-${e.time}`}
                                    className="rounded-lg border bg-white p-3 text-sm"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-800">
                                            {e.description}
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                            ৳{fmt(e.amount)}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                                        <span>
                                            His share: ৳{fmt(myShare?.amount ?? 0)}
                                        </span>
                                        <span>{e.time}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="mt-8">
                <h2 className="mb-3 text-xl font-bold text-black">
                    Shared in ({expensesSharedIn.length})
                </h2>
                <p className="mb-3 text-sm text-gray-600">
                    Total his shares across all expenses: ৳
                    {fmt(totalHisSharesOfAll)}
                </p>
                {expensesSharedIn.length === 0 ? (
                    <p className="text-gray-500">
                        This member has no expense shares.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {expensesSharedIn.map((e) => {
                            const myShare = (e.shares ?? []).find(
                                (s) => s.memberName === member.name
                            );
                            const isPayer = e.payerName === member.name;
                            return (
                                <li
                                    key={e.id ?? `${e.description}-${e.time}`}
                                    className="rounded-lg border bg-white p-3 text-sm"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-800">
                                            {e.description}
                                        </span>
                                        <span className="font-semibold text-gray-900">
                                            ৳{fmt(myShare?.amount ?? 0)}
                                        </span>
                                    </div>
                                    <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                                        <span>
                                            Paid by {e.payerName}
                                            {isPayer ? " (him)" : ""}
                                        </span>
                                        <span>{e.time}</span>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>

            <section className="mt-8">
                <h2 className="mb-3 text-xl font-bold text-black">
                    Deposits ({myDeposits.length})
                </h2>
                <p className="mb-3 text-sm text-gray-600">
                    Total deposits: ৳{fmt(totalDeposits)}
                </p>
                {myDeposits.length === 0 ? (
                    <p className="text-gray-500">No deposits yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {myDeposits.map((d) => (
                            <li
                                key={d.id}
                                className="rounded-lg border bg-white p-3 text-sm"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-medium text-gray-800">
                                        {d.description}
                                    </span>
                                    <span className="font-semibold text-gray-900">
                                        ৳{fmt(d.amount)}
                                    </span>
                                </div>
                                <div className="mt-1 text-xs text-gray-500">
                                    {d.createdAt}
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>

            <section className="mt-8">
                <h2 className="mb-3 text-xl font-bold text-black">Debts</h2>
                {myDebts.length === 0 ? (
                    <p className="text-gray-500">No outstanding debts.</p>
                ) : (
                    <ul className="space-y-2">
                        {myDebts.map((d) => {
                            const remaining = d.originalAmount - d.settledAmount;
                            const isOwedToThem = d.toMember === member.name;
                            return (
                                <li
                                    key={d.id}
                                    className="rounded-lg border bg-white p-3 text-sm"
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium text-gray-800">
                                            {isOwedToThem
                                                ? `${d.fromMember} owes him`
                                                : `He owes ${d.toMember}`}
                                        </span>
                                        <span
                                            className={`font-semibold ${remaining > 0
                                                    ? isOwedToThem
                                                        ? "text-green-600"
                                                        : "text-red-600"
                                                    : "text-gray-500 line-through"
                                                }`}
                                        >
                                            ৳{fmt(remaining)}
                                        </span>
                                    </div>
                                    <div className="mt-1 text-xs text-gray-500">
                                        Original ৳{fmt(d.originalAmount)}, settled ৳
                                        {fmt(d.settledAmount)}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </section>
        </div>
    );
}