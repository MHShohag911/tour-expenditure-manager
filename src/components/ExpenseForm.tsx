
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

type ExpenseFormProps = {
  groups: Group[];
  groupId: string;
  onAddExpense: (
    groupId: string,
    description: string,
    amount: number,
    payerName: string,
    dateTime: string,
  ) => void;
  onAddExtraCharge: (
    groupId: string,
    extraAmount: number,
    paidBy: string,
    owedBy: string,
  ) => void;
};

const ExpenseForm = ({
  groups,
  groupId,
  onAddExpense,
  onAddExtraCharge,
}: ExpenseFormProps) => {
  const [error, setError] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [payerName, setPayerName] = useState("");
  const [extraAmount, setExtraAmount] = useState("");
  const [paidBy, setPaidBy] = useState("");
  const [owedBy, setOwedBy] = useState("");

  const currentGroup = groups.find((group) => group._id === groupId);
  const members = currentGroup?.members ?? [];

  const inputClassName =
    "w-full max-h-12 rounded-md border border-gray-300 bg-white px-3 py-3 text-gray-900 outline-none transition focus:border-[#090040] focus:ring-1 focus:ring-[#090040] disabled:cursor-not-allowed disabled:bg-gray-100";

  const buttonClassName =
    "rounded-md bg-[#090040] px-4 py-3 font-medium text-white transition hover:bg-[#20116b] disabled:cursor-not-allowed disabled:opacity-50";

  const handleAddExpense = () => {
    const numericAmount = Number(amount);

    if (!description.trim()) {
      setError("Please enter an expense description.");
      return;
    }

    if (!amount.trim() || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("Amount must be a positive number.");
      return;
    }

    if (!payerName) {
      setError("Please select who paid for this expense.");
      return;
    }

    // Format the date and time using the user's local time.
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");

    const currentDateTime =
      `${year}-${month}-${day}T${hours}:${minutes}`;

    onAddExpense(
      groupId,
      description.trim(),
      numericAmount,
      payerName,
      currentDateTime,
    );

    setDescription("");
    setAmount("");
    setPayerName("");
    setError("");
  };

  const handleExtraCharge = () => {
    const numericExtraAmount = Number(extraAmount);

    if (
      !extraAmount.trim() ||
      !Number.isFinite(numericExtraAmount) ||
      numericExtraAmount <= 0
    ) {
      setError("Extra amount must be a positive number.");
      return;
    }

    if (!paidBy || !owedBy) {
      setError("Please select who paid and who owes the extra charge.");
      return;
    }

    onAddExtraCharge(
      groupId,
      numericExtraAmount,
      paidBy,
      owedBy,
    );

    setExtraAmount("");
    setPaidBy("");
    setOwedBy("");
    setError("");
  };

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
              step="any"
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

            <div className="h-12">
              <select
              id={`payer-${groupId}`}
              value={payerName}
              onChange={(event) => setPayerName(event.target.value)}
              className={`${inputClassName} h-full`}
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
      </section>

      {/* Extra Charge */}
      <section className="mt-8 border-t border-gray-200 pt-6">
        <h2 className="mb-4 text-xl font-bold text-black">
          Extra Charge
        </h2>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <label
              htmlFor={`extra-amount-${groupId}`}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Extra Amount
            </label>

            <input
              id={`extra-amount-${groupId}`}
              type="number"
              min="0"
              step="any"
              value={extraAmount}
              onChange={(event) => setExtraAmount(event.target.value)}
              placeholder="Enter extra amount"
              className={inputClassName}
              disabled={!currentGroup?.isDisabled}
            />
          </div>

          <div>
            <label
              htmlFor={`paid-by-${groupId}`}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Paid By
            </label>

            <select
              id={`paid-by-${groupId}`}
              value={paidBy}
              onChange={(event) => setPaidBy(event.target.value)}
              className={`${inputClassName} h-full`}
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

          <div>
            <label
              htmlFor={`owed-by-${groupId}`}
              className="mb-1 block text-sm font-medium text-gray-700"
            >
              Owed By
            </label>

            <select
              id={`owed-by-${groupId}`}
              value={owedBy}
              onChange={(event) => setOwedBy(event.target.value)}
              className={`${inputClassName} h-full`}
              disabled={!currentGroup?.isDisabled}
            >
              <option value="">Select member</option>

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

        <button
          type="button"
          disabled={!currentGroup?.isDisabled}
          onClick={handleExtraCharge}
          className={`${buttonClassName} mt-3`}
        >
          Add Extra Charge
        </button>
      </section>
    </div>
  );
};

export default ExpenseForm;
