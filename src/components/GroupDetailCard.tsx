"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import ExpenseForm from "./ExpenseForm";
import ExpenseList from "./ExpenseList";
import { axiosSecure } from "../hooks/useAxiosSecure";
import type { Group } from "@/types/group";
import { IoIosLock, IoIosUnlock } from "react-icons/io";
import { useRouter } from "next/navigation";
import Link from "next/link";

type GroupDetailCardProps = {
  group: Group;
  // Optional handlers for the dashboard view
  onAddMember?: (groupId: string, memberName: string) => void;
  onAddExpense?: (
    groupId: string,
    description: string,
    amount: number,
    payerName: string,
    currentDateTime: string,
    shares: { memberName: string; amount: number }[],
  ) => void;
  onAddDeposit?: (
    groupId: string,
    memberName: string,
    amount: number,
    description: string,
  ) => void;
  handleSetGroup?: (groupId: string) => void;
  handleFinishTour?: (groupId: string) => void;
  onDeleteGroup?: (groupId: string) => void;
  refreshGroups?: () => Promise<void>;
  // If true, hides the "Back" link and action buttons (for read-only detail view)
  isDetailView?: boolean;
};

export default function GroupDetailCard({
  group,
  onAddMember,
  onAddExpense,
  onAddDeposit,
  handleSetGroup,
  handleFinishTour,
  onDeleteGroup,
  refreshGroups,
}: GroupDetailCardProps) {
  const [memberNames, setMemberNames] = useState<Record<string, string>>({});
  const [openDepositFor, setOpenDepositFor] = useState<string | null>(null);
  const router = useRouter();

  const handleAddMember = () => {
    if (!onAddMember) return;
    const memberName = (memberNames[group._id] || "").trim();
    if (!memberName) return;
    onAddMember(group._id, memberName);
    setMemberNames((prev) => ({ ...prev, [group._id]: "" }));
  };

  const handleDeleteMember = async (index: number) => {
    const result = await Swal.fire({
      title: "Delete member?",
      text: "Are you sure you want to remove this member?",
      icon: "warning",
      confirmButtonColor: "#1DD100",
      cancelButtonColor: "#ef4444",
      customClass: {
        confirmButton: "text-black font-semibold",
      },
      showCancelButton: true,
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await axiosSecure.delete<{
        message: string;
        group?: Group;
      }>(`/teamDB/${group._id}/removeMemberByIndex`, { params: { index } });

      if (response.data.group && refreshGroups) {
        await refreshGroups();
      } else if (refreshGroups) {
        await refreshGroups();
      }

      Swal.fire({
        title: "Deleted",
        text: "Successfully deleted the member.",
        icon: "success",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      console.error("Error deleting member:", error);
      Swal.fire("Error", "Unable to delete the member.", "error");
    }
  };

  const handleLock = async () => {
    // If a password already exists, just lock it immediately
    if (group.lockHash) {
      try {
        // We pass a dummy password because the backend only checks for
        // a password if it's setting a NEW one. But to be safe with our API,
        // we can add a new action "lock" to just flip the boolean without a password.
        const res = await axiosSecure.post(`/teamDB/${group._id}/lock`, {
          action: "lock",
        });
        if (res.status === 200) {
          router.refresh();
          if (refreshGroups) await refreshGroups();
        }

        Swal.fire({
          title: "Locked!",
          text: "The group is now locked.",
          icon: "success",
          showConfirmButton: false,
          timer: 1500,
        });
      } catch (error) {
        console.error(error);
        Swal.fire("Error", "Could not lock the group.", "error");
      }
      return;
    }

    // If no password exists, ask to set one
    const { value: password } = await Swal.fire({
      title: "Set Lock Password",
      text: "Enter a 6-digit PIN to lock this group. You will need this to unlock it.",
      input: "password",
      inputAttributes: {
        maxlength: "6",
        autocapitalize: "off",
        autocorrect: "off",
        pattern: "[0-9]*",
        inputmode: "numeric",
      },
      showCancelButton: true,
      confirmButtonText: "Lock",
      confirmButtonColor: "#1DD100",
      inputValidator: (value) => {
        if (!value || !/^\d{6}$/.test(value)) {
          return "Password must be exactly 6 digits.";
        }
      },
    });

    if (!password) return;

    try {
      const res = await axiosSecure.post(`/teamDB/${group._id}/lock`, {
        action: "set",
        password,
      });
      if (res.status === 200 && refreshGroups) await refreshGroups();
      Swal.fire({
        title: "Locked!",
        text: "The group is now locked.",
        icon: "success",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "Could not lock the group.", "error");
    }
  };

  const handleUnlock = async () => {
    const { value: password } = await Swal.fire({
      title: "Unlock Group",
      text: "Enter the 6-digit PIN to unlock.",
      input: "password",
      inputAttributes: {
        maxlength: "6",
        autocapitalize: "off",
        autocorrect: "off",
        pattern: "[0-9]*",
        inputmode: "numeric",
      },
      showCancelButton: true,
      confirmButtonText: "Unlock",
      confirmButtonColor: "#1DD100",
    });

    if (!password) return;

    try {
      const res = await axiosSecure.post(`/teamDB/${group._id}/lock`, {
        action: "unlock",
        password,
      });
      if (res.status === 200) {
        router.refresh();
        if (refreshGroups) await refreshGroups();
      }
      Swal.fire({
        title: "Unlocked!",
        text: "The group is now unlocked.",
        icon: "success",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error: any) {
      Swal.fire(
        "Error",
        error.response?.data?.message || "Incorrect password.",
        "error",
      );
    }
  };

  const handleDeleteLock = async () => {
    const { value: password } = await Swal.fire({
      title: "Delete Lock",
      text: "Enter the 6-digit PIN to remove the lock permanently.",
      input: "password",
      inputAttributes: {
        maxlength: "6",
        autocapitalize: "off",
        autocorrect: "off",
        pattern: "[0-9]*",
        inputmode: "numeric",
      },
      showCancelButton: true,
      confirmButtonText: "Delete Lock",
      confirmButtonColor: "#ef4444",
    });

    if (!password) return;

    try {
      const res = await axiosSecure.post(`/teamDB/${group._id}/lock`, {
        action: "delete",
        password,
      });
      if (res.status === 200) {
        router.refresh();
        if (refreshGroups) await refreshGroups();
      }
      Swal.fire({
        title: "Lock Deleted!",
        text: "The lock has been removed.",
        icon: "success",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error: any) {
      Swal.fire(
        "Error",
        error.response?.data?.message || "Incorrect password.",
        "error",
      );
    }
  };

  return (
    <div className="border-t-2 border-dashed border-[#1DD100] mt-8">
      <div className="my-8 rounded-xl border border-gray-200 bg-white py-2 shadow-md md:py-8 animate-fade-in-up">
        <div className="p-5">
          <div className="flex flex-col justify-between space-y-2 md:flex-row md:space-y-0">
            <h2 className="text-3xl font-bold text-black">{group.name}</h2>

            <div className="flex justify-between gap-2">
              <div className="flex flex-col md:flex-row gap-2">
                {group.isDisabled && !group.isFinished && handleFinishTour && (
                  <button
                    type="button"
                    onClick={() => handleFinishTour(group._id)}
                    className="rounded-md bg-white text-[#1DD100] border border-[#1DD100] px-4 py-2 text-sm font-medium transition hover:bg-[#1DD100] hover:text-white"
                  >
                    Finish Tour
                  </button>
                )}

                {onDeleteGroup && (
                  <button
                    type="button"
                    onClick={() => onDeleteGroup(group._id)}
                    className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Delete Group
                  </button>
                )}
              </div>

              <div className="flex flex-col md:flex-row gap-2">
                {/* --- NEW LOCK BUTTONS --- */}
                <div className="flex justify-end">
                  {group.isLocked ? (
                    <button
                      type="button"
                      onClick={handleUnlock}
                      className="rounded-full text-black p-2 text-sm font-medium transition hover:bg-[#111827] flex items-center border border-[#1DD100] bg-[#1DD100]/10"
                    >
                      <IoIosLock className="text-[#1DD100] text-2xl" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleLock}
                      className="rounded-full text-black p-2 text-sm font-medium transition hover:bg-[#111827] flex items-center border border-[#1DD100] bg-[#1DD100]/10"
                    >
                      <IoIosUnlock className="text-[#1DD100] text-2xl" />
                    </button>
                  )}
                </div>

                {!group.isLocked && group.lockHash && (
                  <button
                    type="button"
                    onClick={handleDeleteLock}
                    className="rounded-md border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                  >
                    Delete Lock
                  </button>
                )}
              </div>
            </div>
          </div>

          {!group.isDisabled && !group.isLocked && onAddMember && (
            <div className="my-5 space-y-2">
              <input
                type="text"
                placeholder="Member Name"
                value={memberNames[group._id] || ""}
                onChange={(e) =>
                  setMemberNames((prev) => ({
                    ...prev,
                    [group._id]: e.target.value,
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddMember();
                  }
                }}
                className="w-full rounded-md border border-gray-300 px-3 py-3 text-black outline-none focus:border-[#090040] focus:ring-1 focus:ring-[#090040]"
              />
              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={handleAddMember}
                  className="rounded-md bg-[#1DD100] px-3 py-2 font-semibold  transition hover:bg-[#19B300] text-white"
                >
                  Add Member
                </button>
                {!group.isDisabled && handleSetGroup && (
                  <button
                    type="button"
                    onClick={() => handleSetGroup(group._id)}
                    className="rounded-md bg-[#1DD100] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#19B300]"
                  >
                    Set Group
                  </button>
                )}
              </div>
            </div>
          )}

          <div className="mt-5">
            <h3 className="font-bold text-black">Members:</h3>
            <ul className="space-y-3 mt-2">
              {group.members.map((member, index) => {
                // Use gross tour totals for the true net status
                const net = member.totalPaid - member.totalOwed;
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
                    className="rounded-lg border border-gray-200 bg-gray-50 p-4 "
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div className="flex items-baseline gap-2">
                        <span className="text-sm font-medium text-gray-500">
                          {index + 1}.
                        </span>
                        <Link
                          href={`/groups/${group._id}/members/${encodeURIComponent(member.name)}`}
                          className="text-lg font-semibold text-gray-700 hover:text-[#1DD100] underline "
                        >
                          {member.name}
                        </Link>
                      </div>

                      {!group.isDisabled && !group.isLocked && (
                        <button
                          type="button"
                          onClick={() => handleDeleteMember(index)}
                          className="rounded-md border border-red-200 bg-white px-3 py-1 text-sm text-red-600 transition hover:bg-red-50"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4  gap-4 ">
                      <div className="md:mx-auto">
                        <p className="text-xs font-medium text-gray-500">
                          Paid
                        </p>
                        <p className="mt-1 text-base font-bold text-gray-600">
                          ৳{fmt(member.totalPaid)}
                        </p>
                      </div>
                      <div className="md:mx-auto">
                        <p className="text-xs font-medium text-gray-500">
                          Owes
                        </p>
                        <p className="mt-1 text-base font-bold text-gray-600">
                          ৳{fmt(member.totalOwed)}
                        </p>
                      </div>
                      <div className="md:mx-auto">
                        <p className="text-xs font-medium  text-gray-500">
                          A/C Balance
                        </p>
                        <p className="mt-1 text-base font-bold text-gray-600">
                          ৳{fmt(member.accountBalance ?? 0)}
                        </p>
                      </div>

                      <div className="md:mx-auto">
                        <p className="text-xs font-medium text-gray-500">
                          {isSettled
                            ? "Status"
                            : isCreditor
                              ? "Receivable"
                              : "Payable"}
                        </p>
                        <p className="mt-1 text-base font-bold text-gray-900">
                          {isSettled ? (
                            <span className="text-green-700 font-bold">
                              Settled
                            </span>
                          ) : (
                            <span
                              className={
                                isCreditor
                                  ? "text-green-600 font-bold"
                                  : "text-red-600"
                              }
                            >
                              ৳{fmt(Math.abs(net))}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 justify-end">
                      {/* PAY FROM A/C BUTTON */}
                      {!isSettled &&
                        !isCreditor &&
                        (member.accountBalance ?? 0) > 0 && (
                          <button
                            type="button"
                            onClick={async () => {
                              // 1. Find ALL creditors (people who are owed money)
                              const creditors = group.members
                                .filter((m) => {
                                  const mNet = m.totalPaid - m.totalOwed;
                                  return mNet > 0.005 && m.name !== member.name;
                                })
                                // Sort by highest amount owed first
                                .sort((a, b) => {
                                  const aNet = a.totalPaid - a.totalOwed;
                                  const bNet = b.totalPaid - b.totalOwed;
                                  return bNet - aNet;
                                });

                              if (creditors.length === 0) {
                                Swal.fire(
                                  "No creditors",
                                  "Everyone else is settled.",
                                  "info",
                                );
                                return;
                              }

                              let remainingWallet = member.accountBalance ?? 0;
                              let remainingDebt = Math.abs(
                                member.totalPaid - member.totalOwed,
                              );

                              // Preview who gets what
                              const transfers = [];
                              for (const creditor of creditors) {
                                if (remainingWallet <= 0 || remainingDebt <= 0)
                                  break;

                                const creditorOwed =
                                  creditor.totalPaid - creditor.totalOwed;
                                const amount = Math.min(
                                  remainingWallet,
                                  creditorOwed,
                                  remainingDebt,
                                );

                                if (amount > 0.005) {
                                  transfers.push({
                                    toMember: creditor.name,
                                    amount,
                                  });
                                  remainingWallet -= amount;
                                  remainingDebt -= amount;
                                }
                              }

                              if (transfers.length === 0) return;

                              const previewText = transfers
                                .map(
                                  (t) => `৳${fmt(t.amount)} to ${t.toMember}`,
                                )
                                .join(" and ");

                              const result = await Swal.fire({
                                title: "Settle Debts?",
                                text: `Transfer ${previewText} from your A/C?`,
                                icon: "question",
                                showCancelButton: true,
                                confirmButtonColor: "#1DD100",
                                cancelButtonColor: "#ef4444",
                                customClass: {
                                  confirmButton: "text-black font-semibold",
                                },
                                confirmButtonText: "Yes, pay it!",
                              });

                              if (!result.isConfirmed) return;

                              try {
                                // Execute the transfers one by one
                                for (const transfer of transfers) {
                                  await axiosSecure.post(
                                    `/teamDB/${group._id}/settle`,
                                    {
                                      fromMember: member.name,
                                      toMember: transfer.toMember,
                                      amount: transfer.amount,
                                    },
                                  );
                                }
                                if (refreshGroups) await refreshGroups();
                                Swal.fire({
                                  title: "Paid!",
                                  text: "Your debts have been settled from A/C.",
                                  icon: "success",
                                  showConfirmButton: false,
                                  timer: 1500,
                                });
                              } catch (err) {
                                Swal.fire(
                                  "Error",
                                  "Could not process payment.",
                                  "error",
                                );
                              }
                            }}
                            className="rounded-md border  bg-green-600 px-3 py-1 text-sm text-white transition hover:bg-green-700"
                          >
                            Settle Debts from A/C
                          </button>
                        )}

                      {/* DEPOSIT BUTTON AND FORM */}
                      {group.isDisabled &&
                        !group.isFinished &&
                        onAddDeposit && (
                          <>
                            {openDepositFor !==
                            `${group._id}:${member.name}` ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setOpenDepositFor(
                                    `${group._id}:${member.name}`,
                                  )
                                }
                                className="rounded-lg border border-[#1DD100] bg-white px-3 py-1 text-sm font-medium text-[#1DD100] transition hover:bg-[#1DD100] hover:text-white"
                              >
                                + Deposit
                              </button>
                            ) : (
                              <form
                                className="flex w-full flex-col gap-2 sm:flex-row sm:items-center"
                                onSubmit={(event) => {
                                  event.preventDefault();
                                  const form = event.currentTarget;
                                  const data = new FormData(form);
                                  const amount = Number(data.get("amount"));
                                  const description =
                                    String(
                                      data.get("description") ?? "",
                                    ).trim() || "A/C deposit";

                                  if (!Number.isFinite(amount) || amount <= 0) {
                                    Swal.fire(
                                      "Invalid amount",
                                      "Deposit must be greater than zero.",
                                      "error",
                                    );
                                    return;
                                  }

                                  onAddDeposit(
                                    group._id,
                                    member.name,
                                    amount,
                                    description,
                                  );
                                  form.reset();
                                  setOpenDepositFor(null);
                                }}
                              >
                                <input
                                  type="number"
                                  name="amount"
                                  min="0.01"
                                  step="0.01"
                                  placeholder="Amount"
                                  required
                                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-black outline-none focus:border-[#090040] sm:w-32"
                                />
                                <input
                                  type="text"
                                  name="description"
                                  placeholder="Note (optional)"
                                  className="w-full flex-1 rounded-md border border-gray-300 px-3 py-2 text-black outline-none focus:border-[#090040]"
                                />
                                <button
                                  type="submit"
                                  className="rounded-md bg-[#1DD100] px-4 py-2 text-white"
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setOpenDepositFor(null)}
                                  className="rounded-md border border-gray-300 px-4 py-2 text-gray-700"
                                >
                                  Cancel
                                </button>
                              </form>
                            )}
                          </>
                        )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-5 mt-6">
            {!group.isFinished && !group.isLocked && onAddExpense && (
              <ExpenseForm
                groups={[group]}
                groupId={group._id}
                onAddExpense={onAddExpense}
              />
            )}

            <ExpenseList
              groupId={group._id}
              groups={[group]}
              group={group}
              expenses={group.expenses ?? []}
              isFinished={group.isFinished}
              expenseId={group._id}
              onRefresh={refreshGroups || (async () => {})}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
