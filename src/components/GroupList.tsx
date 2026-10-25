
"use client";

import { useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import Swal from "sweetalert2";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import { axiosSecure } from "../hooks/useAxiosSecure";
import type { Group } from "@/types/group";

type GroupListProps = {
  groups: Group[];
  setGroups: Dispatch<SetStateAction<Group[]>>;
  onAddMember: (groupId: string, memberName: string) => void;
  handleSetGroup: (groupId: string) => void;
  handleFinishTour: (groupId: string) => void;
  onAddExpense: (
    groupId: string,
    description: string,
    amount: number,
    payerName: string,
    currentDateTime: string,
    shares: { memberName: string; amount: number }[]
  ) => void;
  onAddDeposit: (
    groupId: string,
    memberName: string,
    amount: number,
    description: string
  ) => void;
};

const GroupList = ({
  groups,
  setGroups,
  onAddMember,
  onAddExpense,
  handleSetGroup,
  handleFinishTour,
  onAddDeposit
}: GroupListProps) => {
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});

  const refreshGroups = async () => {
    const response = await axiosSecure.get<Group[]>("/teamDB");
    setGroups(response.data);
  };

  const handleAddMember = (groupId: string) => {
    const memberName = (memberNames[groupId] || "").trim();

    if (!memberName) return;

    onAddMember(groupId, memberName);

    setMemberNames((previous) => ({
      ...previous,
      [groupId]: "",
    }));
  };

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find((item) => item._id === groupId);

    if (!group) return;

    const result = await Swal.fire({
      title: group.name,
      text: "Are you sure you want to delete this group?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#15D8B3",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      await axiosSecure.delete(`/teamDB/${groupId}`);
      await refreshGroups();

      await Swal.fire({
        title: "Deleted!",
        text: `${group.name} has been deleted.`,
        icon: "success",
        showConfirmButton: false,
        timer: 1500
      });
    } catch (error) {
      console.error("Error deleting group:", error);

      await Swal.fire({
        title: "Error",
        text: "Unable to delete the group. Please try again.",
        icon: "error",
      });
    }
  };

  const handleDeleteMember = async (
    index: number,
    groupId: string,
  ) => {
    console.log(index, groupId)
    const result = await Swal.fire({
      title: "Delete member?",
      text: "Are you sure you want to remove this member?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      await axiosSecure.delete(
        `/teamDB/${groupId}/removeMemberByIndex`,
        { params: { index } },
      );

      await refreshGroups();

      Swal.fire({
        title: "Deleted",
        text: 'Successfully deleted the member.',
        icon: "success",
        showConfirmButton: false,
        timer: 1500
      });
    } catch (error) {
      console.error("Error deleting member:", error);

      await Swal.fire({
        title: "Error",
        text: "Unable to delete the member. Please try again.",
        icon: "error",
        // showConfirmButton: false,
      });
    }
  };

  return (
    <div>
      {groups.map((group) => (
        <div
          key={group._id}
          className="my-12 rounded-xl border border-gray-200 bg-white py-2 shadow-md md:py-8"
        >
          <div className="p-5">
            <div className="flex flex-col justify-between space-y-2 md:flex-row md:space-y-0">
              <h2 className="text-3xl font-bold text-black">
                {group.name}
              </h2>

              <div className="flex justify-between gap-2">
                {!group.isDisabled && (
                  <button
                    type="button"
                    onClick={() => handleSetGroup(group._id)}
                    className="rounded-md bg-[#090040] px-4 py-2 text-white transition hover:bg-[#20116b]"
                  >
                    Set Group
                  </button>
                )}

                {group.isDisabled && !group.isFinished && (
                  <button
                    type="button"
                    onClick={() => handleFinishTour(group._id)}
                    className="rounded-md bg-[#090040] px-4 py-2 text-white transition hover:bg-[#20116b]"
                  >
                    Finish Tour
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDeleteGroup(group._id)}
                  className="rounded-md bg-[#090040] px-4 py-2 text-white transition hover:bg-[#20116b]"
                >
                  Delete Group
                </button>

              </div>
            </div>

            <div className="my-5 space-y-3">
              {
                !group.isDisabled &&
                <div className="space-y-2">
                  <input
                    type="text"
                    aria-label={`Member name for ${group.name}`}
                    placeholder="Member Name"
                    value={memberNames[group._id] || ""}
                    disabled={group.isDisabled || group.isFinished}
                    onChange={(event) =>
                      setMemberNames((previous) => ({
                        ...previous,
                        [group._id]: event.target.value,
                      }))
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        handleAddMember(group._id);
                      }
                    }}
                    className="w-full rounded-md border border-gray-300 px-3 py-3 text-black outline-none focus:border-[#090040] focus:ring-1 focus:ring-[#090040] disabled:bg-gray-100"
                  />

                  <button
                    type="button"
                    disabled={group.isDisabled || group.isFinished}
                    onClick={() => handleAddMember(group._id)}
                    className="rounded-md bg-[#090040] px-4 py-3 text-white transition hover:bg-[#20116b] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Add Member
                  </button>
                </div>
              }

            </div>

            <div>
              <h3 className="font-bold text-black">Members:</h3>

              <ul className="space-y-3">
                {group.members.map((member, index) => {
                  const owedToThem = member.accountCreditBalance ?? 0;

                  const stillOwesOthers =
                    (group.outstandingDebts ?? [])
                      .filter((d) => d.fromMember === member.name)
                      .reduce(
                        (sum, d) => sum + (d.originalAmount - d.settledAmount),
                        0
                      );

                  const net = owedToThem - stillOwesOthers;
                  const isSettled = Math.abs(net) < 0.005;
                  const isCreditor = net > 0;

                  const fmt = (n: number) =>
                    n.toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    });

                  return (
                    <li
                      key={`${group._id}-${index}`}
                      className="rounded-lg border border-gray-200 bg-gray-50 p-4"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-gray-500">
                            {index + 1}.
                          </span>
                          <span className="text-lg font-semibold text-gray-900">
                            {member.name}
                          </span>
                        </div>

                        {!group.isDisabled && (
                          <button
                            type="button"
                            onClick={() => handleDeleteMember(index, group._id)}
                            className="rounded-md border border-red-200 bg-white px-3 py-1 text-sm text-red-600 transition hover:bg-red-50"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Paid
                          </p>
                          <p className="mt-1 text-base font-medium text-gray-900">
                            ৳{fmt(member.totalPaid)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Owes
                          </p>
                          <p className="mt-1 text-base font-medium text-gray-900">
                            ৳{fmt(member.totalOwed)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            A/C Balance
                          </p>
                          <p className="mt-1 text-base font-medium text-blue-700">
                            ৳{fmt(member.accountBalance ?? 0)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            Owed to him
                          </p>
                          <p className="mt-1 text-base font-medium text-amber-700">
                            ৳{fmt(owedToThem)}
                          </p>
                        </div>

                        <div>
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                            {isSettled ? "Status" : isCreditor ? "Will Get" : "Will Pay"}
                          </p>
                          <p
                            className={`mt-1 text-base font-semibold ${isSettled
                              ? "text-gray-600"
                              : isCreditor
                                ? "text-green-600"
                                : "text-red-600"
                              }`}
                          >
                            {isSettled ? "Settled" : `৳${fmt(Math.abs(net))}`}
                          </p>
                        </div>
                      </div>

                      {group.isDisabled && !group.isFinished && (
  <form
    className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center"
    onSubmit={(event) => {
      event.preventDefault();
      const form = event.currentTarget;
      const data = new FormData(form);
      const amount = Number(data.get("amount"));
      const description =
        String(data.get("description") ?? "").trim() || "A/C deposit";

      if (!Number.isFinite(amount) || amount <= 0) {
        Swal.fire("Invalid amount", "Deposit must be greater than zero.", "error");
        return;
      }

      onAddDeposit(group._id, member.name, amount, description);
      form.reset();
    }}
  >
    <input
      type="number"
      name="amount"
      min="0.01"
      step="0.01"
      placeholder="Amount"
      required
      className="w-full rounded-md border border-gray-300 px-3 py-2 text-black outline-none focus:border-[#090040] focus:ring-1 focus:ring-[#090040] sm:w-32"
    />
    <input
      type="text"
      name="description"
      placeholder="Note (optional)"
      className="w-full flex-1 rounded-md border border-gray-300 px-3 py-2 text-black outline-none focus:border-[#090040] focus:ring-1 focus:ring-[#090040]"
    />
    <button
      type="submit"
      className="rounded-md bg-[#090040] px-4 py-2 text-white transition hover:bg-[#20116b]"
    >
      Deposit to A/C
    </button>
  </form>
)}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="space-y-5">
              {!group.isFinished && (
                <ExpenseForm
                  groups={groups}
                  groupId={group._id}
                  onAddExpense={onAddExpense}
                />
              )}

              <ExpenseList
                groupId={group._id}
                groups={groups}
                group={group}
                expenses={group.expenses}
                isFinished={group.isFinished}
                expenseId={group._id}
                // extraCharges={group.extraCharges}
                onRefresh={refreshGroups}
              />
            </div>

          </div>
        </div>
      ))}
    </div>
  );
};

export default GroupList;
