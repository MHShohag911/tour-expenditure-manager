"use client";

import { useState } from "react";
import { axiosSecure } from "../hooks/useAxiosSecure";

type AccountTransaction = {
  id: string;
  type: string;
  amount: number;
  description: string;
  balanceAfter?: number;
};

type SharedExpense = {
  id?: string;
  description: string;
  payerName: string;
  time: string;
  myShare: number;
  note?: string;
};

type Debt = {
  id: string;
  fromMember: string;
  toMember: string;
  originalAmount: number;
  settledAmount: number;
};

type Deposit = {
  id: string;
  description: string;
  amount: number;
  createdAt: string;
};

type SectionData = {
  transactions?: AccountTransaction[];
  shared?: SharedExpense[];
  debts?: Debt[];
  deposits?: Deposit[];
};

type MemberSectionProps = {
  groupId: string;
  memberName: string;
  type: "transactions" | "shared" | "debts" | "deposits";
  title: string;
};

export default function MemberSection({
  groupId,
  memberName,
  type,
  title,
}: MemberSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<SectionData | null>(null);
  const [error, setError] = useState("");

  const handleToggle = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    setIsOpen(true);

    if (data) return; // Already loaded, don't fetch again

    setIsLoading(true);
    setError("");

    try {
      const response = await axiosSecure.get(
        `/teamDB/${groupId}/members/${encodeURIComponent(memberName)}/section?type=${type}`
      );
      setData(response.data);
    } catch (err) {
      console.error(`Failed to load ${type}:`, err);
      setError("Failed to load data.");
    } finally {
      setIsLoading(false);
    }
  };

  const fmt = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <section className="mt-8 border border-gray-200 rounded-lg bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-black">{title}</h2>
        <button
          onClick={handleToggle}
          className="rounded-md bg-[#090040] px-4 py-2 text-sm text-white transition hover:bg-[#20116b]"
        >
          {isOpen ? "Hide" : "Show"}
        </button>
      </div>

      {isOpen && (
        <div className="mt-4">
          {isLoading && (
            <p className="text-sm text-gray-500 animate-pulse">Loading...</p>
          )}
          {error && <p className="text-sm text-red-600">{error}</p>}

          {!isLoading && !error && data && type === "transactions" && (
            <ul className="space-y-2">
              {data.transactions?.length === 0 ? (
                <p className="text-sm text-gray-500">No A/C transactions yet.</p>
              ) : (
                data.transactions?.map((t) => (
                  <li key={t.id} className="rounded-lg border bg-gray-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 capitalize">
                        {t.type.replace(/_/g, " ")}
                      </span>
                      <span className="font-semibold text-gray-900">৳{fmt(t.amount)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                      <span>{t.description}</span>
                      <span>A/C after: ৳{fmt(t.balanceAfter ?? 0)}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}

          {!isLoading && !error && data && type === "shared" && (
            <ul className="space-y-2">
              {data.shared?.length === 0 ? (
                <p className="text-sm text-gray-500">No shared expenses yet.</p>
              ) : (
                data.shared?.map((e) => (
                  <li key={e.id} className="rounded-lg border bg-gray-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{e.description}</span>
                      <span className="font-semibold text-gray-900">৳{fmt(e.myShare)}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap justify-between gap-2 text-xs text-gray-500">
                      <span>Paid by {e.payerName}</span>
                      <span>{e.time}</span>
                    </div>
                    {e.note && (
                      <div className="mt-1 text-xs italic text-gray-600">Note: {e.note}</div>
                    )}
                  </li>
                ))
              )}
            </ul>
          )}

          {!isLoading && !error && data && type === "debts" && (
            <ul className="space-y-2">
              {data.debts?.length === 0 ? (
                <p className="text-sm text-gray-500">No outstanding debts.</p>
              ) : (
                data.debts?.map((d) => {
                  const remaining = d.originalAmount - d.settledAmount;
                  const isOwedToThem = d.toMember === memberName;
                  return (
                    <li key={d.id} className="rounded-lg border bg-gray-50 p-3 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-gray-800">
                          {isOwedToThem ? `${d.fromMember} owes him` : `He owes ${d.toMember}`}
                        </span>
                        <span className={`font-semibold ${remaining > 0 ? (isOwedToThem ? "text-green-600" : "text-red-600") : "text-gray-500 line-through"}`}>
                          ৳{fmt(remaining)}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        Original ৳{fmt(d.originalAmount)}, settled ৳{fmt(d.settledAmount)}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          )}

          {!isLoading && !error && data && type === "deposits" && (
            <ul className="space-y-2">
              {data.deposits?.length === 0 ? (
                <p className="text-sm text-gray-500">No deposits yet.</p>
              ) : (
                data.deposits?.map((d) => (
                  <li key={d.id} className="rounded-lg border bg-gray-50 p-3 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800">{d.description}</span>
                      <span className="font-semibold text-gray-900">৳{fmt(d.amount)}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      {new Date(d.createdAt).toLocaleString("en-GB", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                        hour12: true,
                      })}
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}