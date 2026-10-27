"use client";

import { useState } from "react";
import type { Group, Member } from "@/types/group";

type Share = {
  memberName: string;
  amount: number;
  note?: string;
};

type ExpenseFormProps = {
  groups: Group[];
  groupId: string;
  onAddExpense: (
    groupId: string,
    description: string,
    amount: number,
    payerName: string,
    dateTime: string,
    shares: Share[],
  ) => void;
};

const ExpenseForm = ({ groups, groupId, onAddExpense }: ExpenseFormProps) => {
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerName, setPayerName] = useState("");
  const [shareAmounts, setShareAmounts] = useState<Record<string, string>>({});
  const [shareNotes, setShareNotes] = useState<Record<string, string>>({});
  const [customMembers, setCustomMembers] = useState<Record<string, boolean>>(
    {},
  );
  const [splitMode, setSplitMode] = useState<"equal" | "custom">("equal");

  const currentGroup = groups.find((group) => group._id === groupId);
  const members = currentGroup?.members ?? [];

  const inputClassName =
    "w-full max-h-12 rounded-md border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none transition focus:border-[#090040] focus:ring-1 focus:ring-[#090040] disabled:cursor-not-allowed disabled:bg-gray-100";

  const buttonClassName =
    "rounded-md px-3 py-2 font-medium transition disabled:cursor-not-allowed disabled:opacity-50";

  // Calculate custom shares and divide the remaining amount equally.
  const calculateCustomShares = (
    totalAmount: number,
    currentMembers: Member[],
    customFlags: Record<string, boolean>,
    currentShares: Record<string, string>,
  ): Record<string, string> => {
    if (!currentMembers.length || totalAmount <= 0) {
      return {};
    }

    const totalCents = Math.round(totalAmount * 100);
    const nextShares: Record<string, string> = {};
    const customList = currentMembers.filter(
      (member) => customFlags[member.name],
    );
    const remainderList = currentMembers.filter(
      (member) => !customFlags[member.name],
    );

    let customTotalCents = 0;

    for (const member of customList) {
      const value = currentShares[member.name] ?? "";
      const cents =
        value.trim() !== "" && Number.isFinite(Number(value))
          ? Math.round(Number(value) * 100)
          : 0;

      nextShares[member.name] = value;
      customTotalCents += cents;
    }

    const remainingCents = totalCents - customTotalCents;

    if (remainingCents < 0) {
      // Keep custom amounts visible, but don't assign negative shares.
      remainderList.forEach((member) => {
        nextShares[member.name] = "0.00";
      });

      return nextShares;
    }

    if (remainderList.length > 0) {
      const baseCents = Math.floor(remainingCents / remainderList.length);
      const extraCents = remainingCents % remainderList.length;

      remainderList.forEach((member, index) => {
        const cents = baseCents + (index < extraCents ? 1 : 0);
        nextShares[member.name] = (cents / 100).toFixed(2);
      });
    }

    return nextShares;
  };

  // Calculate equal shares directly from the current amount and members.
  const calculateEqualShares = (
    totalAmount: number,
    currentMembers: Member[],
  ): Record<string, string> => {
    if (!currentMembers.length) return {};

    const totalCents = Math.round(Math.max(0, totalAmount) * 100);
    const baseCents = Math.floor(totalCents / currentMembers.length);
    const extraCents = totalCents % currentMembers.length;

    const equalShares: Record<string, string> = {};

    currentMembers.forEach((member, index) => {
      const cents = baseCents + (index < extraCents ? 1 : 0);
      equalShares[member.name] = (cents / 100).toFixed(2);
    });

    return equalShares;
  };

  // Derived shares: no useEffect or extra state update required.
  const displayedShares =
    splitMode === "equal"
      ? calculateEqualShares(Number(amount) || 0, members)
      : calculateCustomShares(
          Number(amount) || 0,
          members,
          customMembers,
          shareAmounts,
        );

  // Equal Split automatically recalculates when the total changes.
  const handleCustomAmountChange = (memberName: string, value: string) => {
    setShareAmounts((previous) => ({
      ...previous,
      [memberName]: value,
    }));

    setError("");
  };

  const handleCustomToggle = (memberName: string) => {
    const isCurrentlyCustom = Boolean(customMembers[memberName]);

    // Preserve the currently displayed share when enabling Custom.
    if (!isCurrentlyCustom) {
      setShareAmounts((previous) => ({
        ...previous,
        [memberName]: displayedShares[memberName] ?? "0.00",
      }));
    }

    setCustomMembers((previous) => ({
      ...previous,
      [memberName]: !previous[memberName],
    }));

    setError("");
  };

  const handleAddExpense = () => {
    const numericAmount = Number(amount);

    if (!description.trim()) {
      setError("Please enter an expense description.");
      return;
    }

    if (
      !amount.trim() ||
      !Number.isFinite(numericAmount) ||
      numericAmount <= 0
    ) {
      setError("Amount must be a positive number.");
      return;
    }

    if (!payerName) {
      setError("Please select who paid for this expense.");
      return;
    }

    if (!members.length) {
      setError("Add group members before recording an expense.");
      return;
    }

    const shares: Share[] = members.map((member) => {
      const isCustom =
        splitMode === "custom" && Boolean(customMembers[member.name]);
      const note = isCustom ? (shareNotes[member.name] ?? "").trim() : "";
      return {
        memberName: member.name,
        amount: Number(displayedShares[member.name]),
        ...(note ? { note } : {}),
      };
    });

    const hasInvalidShare = shares.some(
      (share) =>
        (displayedShares[share.memberName] ?? "").trim() === "" ||
        !Number.isFinite(share.amount) ||
        share.amount < 0,
    );

    if (hasInvalidShare) {
      setError("Each member must have a valid, non-negative share.");
      return;
    }

    const sharesTotalCents = shares.reduce(
      (total, share) => total + Math.round(share.amount * 100),
      0,
    );

    if (sharesTotalCents !== Math.round(numericAmount * 100)) {
      setError("Individual shares must equal the total expense.");
      return;
    }

    const currentDateTime = new Date().toLocaleString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });

    // console.log(currentDateTime);

    onAddExpense(
      groupId,
      description.trim(),
      numericAmount,
      payerName,
      currentDateTime,
      shares,
    );

    setDescription("");
    setAmount("");
    setPayerName("");
    setError("");
    setShareAmounts({});
    setCustomMembers({});
    setSplitMode("equal");
    setShareNotes({});
  };

  const totalSharesCents = members.reduce(
    (total, member) =>
      total + Math.round((Number(displayedShares[member.name]) || 0) * 100),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Add Expense */}
      <section>
        <h2 className="mb-4 font-bold text-black mt-5">Add Expenses</h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label
              htmlFor={`description-${groupId}`}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Description
            </label>

            <input
              id={`description-${groupId}`}
              type="text"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="e.g. Hotel booking"
              className={inputClassName}
              disabled={
                !currentGroup?.isDisabled || Boolean(currentGroup?.isFinished)
              }
            />
          </div>

          <div>
            <label
              htmlFor={`amount-${groupId}`}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Amount
            </label>

            <input
              id={`amount-${groupId}`}
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              placeholder="Enter amount"
              className={inputClassName}
              disabled={
                !currentGroup?.isDisabled || Boolean(currentGroup?.isFinished)
              }
            />
          </div>

          <div>
            <label
              htmlFor={`payer-${groupId}`}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Payer name
            </label>

            <select
              id={`payer-${groupId}`}
              value={payerName}
              onChange={(event) => setPayerName(event.target.value)}
              className={`${inputClassName} h-12`}
              disabled={
                !currentGroup?.isDisabled || Boolean(currentGroup?.isFinished)
              }
            >
              <option value="">Select payer</option>
              {members.map((member, index) => (
                <option key={`${member.name}-${index}`} value={member.name}>
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-800">Individual Shares</h3>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSplitMode("equal");
                  setCustomMembers({});
                  setError("");
                }}
                className={`${buttonClassName} ${
                  splitMode === "equal"
                    ? "bg-[#1DD100] text-white font-semibold"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Equal Split
              </button>

              <button
                type="button"
                onClick={() => {
                  setSplitMode("custom");
                  setError("");
                }}
                className={`${buttonClassName} ${
                  splitMode === "custom"
                    ? "bg-[#1DD100] text-white font-semibold"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Custom Split
              </button>
            </div>
          </div>

          {splitMode === "custom" && (
            <p className="mb-3 text-sm text-gray-600">
              Select Custom for members with different expenses. Everyone else
              will split the remaining amount equally.
            </p>
          )}

          {splitMode === "equal" ? (
            <div className="rounded-md border border-gray-200 bg-gray-50 p-4 text-center">
              <p className="text-sm font-medium text-gray-600">Equal Split</p>
              <p className="mt-1 text-xl font-bold text-gray-900">
                ৳
                {members.length > 0
                  ? (Number(amount) / members.length || 0).toFixed(2)
                  : "0.00"}{" "}
                per person
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {members.map((member, index) => {
                const isCustom = Boolean(customMembers[member.name]);

                return (
                  <div
                    key={`${member.name}-${index}`}
                    className="rounded-md border border-gray-200 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <label
                        htmlFor={`share-${groupId}-${index}`}
                        className="text-sm font-medium text-gray-700"
                      >
                        {member.name}&apos;s share (৳)
                      </label>

                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={isCustom}
                          onChange={() => handleCustomToggle(member.name)}
                          disabled={
                            !currentGroup?.isDisabled ||
                            Boolean(currentGroup?.isFinished)
                          }
                        />
                        Custom
                      </label>
                    </div>

                    <input
                      id={`share-${groupId}-${index}`}
                      type="number"
                      min="0"
                      step="0.01"
                      value={displayedShares[member.name] ?? ""}
                      onChange={(event) =>
                        handleCustomAmountChange(
                          member.name,
                          event.target.value,
                        )
                      }
                      readOnly={!isCustom}
                      placeholder={
                        isCustom
                          ? "Enter custom amount"
                          : "Automatically calculated"
                      }
                      className={inputClassName}
                      disabled={!currentGroup?.isDisabled || !isCustom}
                    />

                    <p className="mt-1 text-xs text-gray-500">
                      {isCustom
                        ? "Fixed custom amount"
                        : "Shares the remaining amount equally"}
                    </p>

                    {isCustom && (
                      <input
                        type="text"
                        value={shareNotes[member.name] ?? ""}
                        onChange={(event) =>
                          setShareNotes((previous) => ({
                            ...previous,
                            [member.name]: event.target.value,
                          }))
                        }
                        placeholder="Note (e.g. extra item)"
                        disabled={
                          !currentGroup?.isDisabled ||
                          Boolean(currentGroup?.isFinished)
                        }
                        className={`${inputClassName} mt-2 text-xs`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="mt-3 text-sm text-gray-600">
            Total shares: ৳{(totalSharesCents / 100).toFixed(2)}
            {" / "}৳{(Number(amount) || 0).toFixed(2)}
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={
            !currentGroup?.isDisabled || Boolean(currentGroup?.isFinished)
          }
          onClick={handleAddExpense}
          className={`${buttonClassName} mt-3`}
        >
          Add Expense
        </button>
      </section>
    </div>
  );
};

export default ExpenseForm;
