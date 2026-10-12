
"use client";

import { useState } from "react";

type Member = {
  name: string;
};

type Group = {
  _id: string;
  isDisabled: boolean;
  members: Member[];
};

type Share = {
  memberName: string;
  amount: number;
};

type ExpenseItem = {
  description: string;
  amount: number;
  owedBy: string[];
};

type ExpenseShare = {
  memberName: string;
  amount: number;
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
    shares: ExpenseShare[],
    items: ExpenseItem[],
  ) => void;
};

const ExpenseForm = ({
  groups,
  groupId,
  onAddExpense,
}: ExpenseFormProps) => {
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerName, setPayerName] = useState("");
  const [items, setItems] = useState<ExpenseItem[]>([]);
  const [itemDescription, setItemDescription] = useState("");
  const [itemAmount, setItemAmount] = useState("");
  const [itemOwedBy, setItemOwedBy] = useState<string[]>([]);
  const [shareAmounts, setShareAmounts] = useState<
    Record<string, string>
  >({});
  const [customMembers, setCustomMembers] = useState<
    Record<string, boolean>
  >({});
  const [splitMode, setSplitMode] = useState<"equal" | "custom">(
    "equal",
  );

  const currentGroup = groups.find((group) => group._id === groupId);
  const members = currentGroup?.members ?? [];

  const inputClassName =
    "w-full max-h-12 rounded-md border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none transition focus:border-[#090040] focus:ring-1 focus:ring-[#090040] disabled:cursor-not-allowed disabled:bg-gray-100";

  const buttonClassName =
    "rounded-md bg-[#090040] px-4 py-3 font-medium text-white transition hover:bg-[#20116b] disabled:cursor-not-allowed disabled:opacity-50";

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
      const baseCents = Math.floor(
        remainingCents / remainderList.length,
      );
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
  const handleCustomAmountChange = (
    memberName: string,
    value: string,
  ) => {
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
        [memberName]:
          displayedShares[memberName] ?? "0.00",
      }));
    }

    setCustomMembers((previous) => ({
      ...previous,
      [memberName]: !previous[memberName],
    }));

    setError("");
  };


  const handleAddItem = () => {
    const numericItemAmount = Number(itemAmount);

    if (!itemDescription.trim()) {
      setError("Please enter an item description.");
      return;
    }

    if (
      !itemAmount.trim() ||
      !Number.isFinite(numericItemAmount) ||
      numericItemAmount <= 0
    ) {
      setError("Item amount must be a positive number.");
      return;
    }

    if (itemOwedBy.length === 0) {
      setError("Please select at least one member responsible for this item.");
      return;
    }

    setItems((previousItems) => [
      ...previousItems,
      {
        description: itemDescription.trim(),
        amount: numericItemAmount,
        owedBy: itemOwedBy,
      },
    ]);

    setItemDescription("");
    setItemAmount("");
    setItemOwedBy([]);
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


    const itemsTotal = items.reduce(
      (total, item) => total + Number(item.amount),
      0,
    );

    const totalAmount = numericAmount + itemsTotal;

    let shares: Share[] = [];

    if (splitMode === "custom") {
      shares = members.map((member) => ({
        memberName: member.name,
        amount: Number(displayedShares[member.name]),
      }));

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
        setError("Custom shares must equal the shared expense amount.");
        return;
      }
    }

    const now = new Date();
    const currentDateTime = [
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`,
      `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
    ].join("T");

    onAddExpense(
      groupId,
      description.trim(),
      totalAmount,
      payerName,
      currentDateTime,
      shares,
      items,
    );


    setDescription("");
    setAmount("");
    setPayerName("");
    setError("");
    setShareAmounts({});
    setCustomMembers({});
    setSplitMode("equal");
  };

  const totalSharesCents = members.reduce(
    (total, member) =>
      total +
      Math.round(
        (Number(displayedShares[member.name]) || 0) * 100,
      ),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Add Expense */}
      <section>
        <h2 className="mb-4 text-xl font-bold text-black">
          Add Expense
        </h2>

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
              disabled={!currentGroup?.isDisabled}
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
              disabled={!currentGroup?.isDisabled}
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
              disabled={!currentGroup?.isDisabled}
            >
              <option value="">Select payer</option>
              {members.map((member, index) => (
                <option
                  key={`${member.name}-${index}`}
                  value={member.name}
                >
                  {member.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-semibold text-gray-800">
              Individual Shares
            </h3>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setSplitMode("equal");
                  setCustomMembers({});
                  setError("");
                }}
                className={`${buttonClassName} ${splitMode === "equal"
                  ? ""
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
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
                className={`${buttonClassName} ${splitMode === "custom"
                  ? ""
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
              >
                Custom Split
              </button>
            </div>
          </div>

          {splitMode === "custom" && (
            <p className="mb-3 text-sm text-gray-600">
              Select Custom for members with different expenses.
              Everyone else will split the remaining amount equally.
            </p>
          )}

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

                    {splitMode === "custom" && (
                      <label className="flex items-center gap-2 text-xs text-gray-600">
                        <input
                          type="checkbox"
                          checked={isCustom}
                          onChange={() =>
                            handleCustomToggle(member.name)
                          }
                          disabled={!currentGroup?.isDisabled}
                        />
                        Custom
                      </label>
                    )}
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
                    readOnly={splitMode === "equal" || !isCustom}
                    placeholder={
                      splitMode === "equal"
                        ? "Equal share"
                        : isCustom
                          ? "Enter custom amount"
                          : "Automatically calculated"
                    }
                    className={inputClassName}
                    disabled={
                      !currentGroup?.isDisabled ||
                      splitMode === "equal" ||
                      !isCustom
                    }
                  />

                  {splitMode === "custom" && (
                    <p className="mt-1 text-xs text-gray-500">
                      {isCustom
                        ? "Fixed custom amount"
                        : "Shares the remaining amount equally"}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-sm text-gray-600">
            Total shares: ৳{(totalSharesCents / 100).toFixed(2)}
            {" / "}
            ৳{(Number(amount) || 0).toFixed(2)}
          </p>
        </div>

        {error && (
          <p role="alert" className="mt-2 text-sm text-red-500">
            {error}
          </p>
        )}

        <button
          type="button"
          disabled={!currentGroup?.isDisabled}
          onClick={handleAddExpense}
          className={`${buttonClassName} mt-3`}
        >
          Add Expense
        </button>


        <div className="mt-6 border-t border-gray-200 pt-5">
          <h3 className="mb-3 text-lg font-semibold text-black">
            Individual Items (Optional)
          </h3>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Item description
              </label>
              <input
                type="text"
                value={itemDescription}
                onChange={(event) => setItemDescription(event.target.value)}
                placeholder="e.g. Extra chicken"
                className={inputClassName}
                disabled={!currentGroup?.isDisabled}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">
                Item amount
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={itemAmount}
                onChange={(event) => setItemAmount(event.target.value)}
                placeholder="Enter item amount"
                className={inputClassName}
                disabled={!currentGroup?.isDisabled}
              />
            </div>
          </div>

          <div className="mt-3">
            <p className="mb-2 text-sm font-medium text-gray-700">
              Who owes for this item?
            </p>

            <div className="flex flex-wrap gap-3">
              {members.map((member, index) => (
                <label
                  key={`${member.name}-${index}`}
                  className="flex items-center gap-2 text-sm text-gray-700"
                >
                  <input
                    type="checkbox"
                    checked={itemOwedBy.includes(member.name)}
                    onChange={(event) => {
                      setItemOwedBy((previousMembers) =>
                        event.target.checked
                          ? [...previousMembers, member.name]
                          : previousMembers.filter(
                            (name) => name !== member.name
                          )
                      );
                    }}
                    disabled={!currentGroup?.isDisabled}
                  />
                  {member.name}
                </label>
              ))}
            </div>
          </div>

          <button
            type="button"
            disabled={!currentGroup?.isDisabled}
            onClick={handleAddItem}
            className={`${buttonClassName} mt-3`}
          >
            Add Individual Item
          </button>

          {items.length > 0 && (
            <div className="mt-4 space-y-2">
              <h4 className="font-medium text-gray-800">
                Items added
              </h4>

              {items.map((item, index) => (
                <div
                  key={`${item.description}-${index}`}
                  className="flex flex-col justify-between gap-2 rounded-md border border-gray-200 p-3 sm:flex-row sm:items-center"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {item.description}
                    </p>
                    <p className="text-sm text-gray-500">
                      Owed by: {item.owedBy.join(", ")}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">
                      ৳{item.amount.toFixed(2)}
                    </span>


                    <button
                      type="button"
                      onClick={() => {
                        setItems((previousItems) =>
                          previousItems.filter((_, i) => i !== index),
                        );

                        setError("");
                      }}
                      className="text-sm font-medium text-red-600 hover:text-red-800"
                    >
                      Remove
                    </button>

                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </section>
    </div>
  );
};

export default ExpenseForm;
