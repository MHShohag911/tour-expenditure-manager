"use client";

import Link from "next/link";
import type { Dispatch, SetStateAction } from "react";
import Swal from "sweetalert2";
import GroupDetailCard from "./GroupDetailCard";
import { axiosSecure } from "../hooks/useAxiosSecure";
import type { Group } from "@/types/group";
import { FaTrash } from "react-icons/fa";

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
    shares: { memberName: string; amount: number }[],
  ) => void;
  onAddDeposit: (
    groupId: string,
    memberName: string,
    amount: number,
    description: string,
  ) => void;
};

const GroupList = ({
  groups,
  setGroups,
  onAddMember,
  onAddExpense,
  handleSetGroup,
  handleFinishTour,
  onAddDeposit,
}: GroupListProps) => {
  const refreshGroups = async () => {
    const response = await axiosSecure.get<Group[]>("/teamDB");
    setGroups(response.data);
  };

  const handleDeleteGroup = async (groupId: string) => {
    const group = groups.find((item) => item._id === groupId);
    if (!group) return;

    const result = await Swal.fire({
      title: group.name,
      text: "Are you sure you want to delete this group?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#1DD100",
      cancelButtonColor: "#ef4444",
      customClass: {
        confirmButton: "text-black font-semibold",
      },
      confirmButtonText: "Yes, delete it!",
    });

    if (!result.isConfirmed) return;

    let password = "";

    // If the group has a lock, ask for the password
    if (group.lockHash) {
      const { value } = await Swal.fire({
        title: "Enter Password",
        text: "This group is locked. Enter the 6-digit PIN to delete it.",
        input: "password",
        inputAttributes: {
          maxlength: "6",
          pattern: "[0-9]*",
          inputmode: "numeric",
        },
        showCancelButton: true,
        confirmButtonText: "Delete",
        confirmButtonColor: "#d33",
        inputValidator: (val) => {
          if (!val || val.length !== 6) return "Please enter the 6-digit PIN.";
        },
      });
      if (!value) return;
      password = value;
    }

    try {
      await axiosSecure.delete(`/teamDB/${groupId}`, {
        params: { password },
      });
      await refreshGroups();
      Swal.fire({
        title: "Deleted!",
        text: `${group.name} has been deleted.`,
        icon: "success",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      console.error("Error deleting group:", error);

      let errorMessage = "Unable to delete the group.";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (
        typeof error === "object" &&
        error !== null &&
        "response" in error
      ) {
        // Safely check for Axios error response
        const axiosError = error as {
          response?: { data?: { message?: string } };
        };
        if (axiosError.response?.data?.message) {
          errorMessage = axiosError.response.data.message;
        }
      }

      await Swal.fire("Error", errorMessage, "error");
    }
  };

  const activeGroups = groups.filter((g) => !g.isFinished);
  const finishedGroups = groups.filter((g) => g.isFinished);

  return (
    <div>
      {/* Active Groups */}
      {activeGroups.map((group) => (
        <GroupDetailCard
          key={group._id}
          group={group}
          onAddMember={onAddMember}
          onAddExpense={onAddExpense}
          onAddDeposit={onAddDeposit}
          handleSetGroup={handleSetGroup}
          handleFinishTour={handleFinishTour}
          onDeleteGroup={handleDeleteGroup}
          refreshGroups={refreshGroups}
        />
      ))}

      {/* Finished Groups */}
      {finishedGroups.length > 0 && (
        <div className="mt-12 border-t-2 border-dashed border-[#1DD100] pt-8">
          <h2 className="mb-6 text-2xl font-bold text-gray-700">
            Finished Tours
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {[...finishedGroups].map((group) => {
              // Calculate total spend and dates from expenses
              const totalSpend = (group.expenses ?? []).reduce(
                (sum, e) => sum + e.amount,
                0,
              );

              let dateRange = "No dates";
              if (group.expenses && group.expenses.length > 0) {
                const dates = group.expenses.map(
                  (e) => new Date(e.createdAt || e.time),
                );
                const minDate = new Date(
                  Math.min(...dates.map((d) => d.getTime())),
                );
                const maxDate = new Date(
                  Math.max(...dates.map((d) => d.getTime())),
                );

                const fmtDate = (d: Date) =>
                  d.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  });
                const days = Math.max(
                  1,
                  Math.ceil(
                    (maxDate.getTime() - minDate.getTime()) /
                      (1000 * 60 * 60 * 24),
                  ),
                );

                dateRange = `${fmtDate(minDate)} - ${fmtDate(maxDate)} (${days} days)`;
              }

              return (
                <div
                  key={group._id}
                  className="my-6 rounded-xl border border-gray-200 bg-white p-6 shadow-sm animate-fade-in-up"
                >
                  <div className="">
                    <div className="flex justify-between">
                      <h2 className="text-2xl font-bold text-gray-700">
                        {group.name}
                      </h2>
                      <button
                          type="button"
                          onClick={() => handleDeleteGroup(group._id)}
                          className="inline-block rounded-full border border-red-200 bg-white p-3 text-sm font-medium text-red-600 h-full transition hover:bg-red-50 my-2 ml-2"
                        >
                          <FaTrash></FaTrash>
                        </button>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">{dateRange}</p>

                    <div className="mt-4 flex flex-wrap gap-6 text-sm">
                      <div>
                        <p className="text-gray-500">Members</p>
                        <p className="font-semibold text-center">
                          {group.members.length}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Total Spend</p>
                        <p className="font-semibold text-center">
                          ৳{totalSpend.toFixed(2)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Avg. Share</p>
                        <p className="font-semibold text-center">
                          ৳
                          {(group.members.length > 0
                            ? totalSpend / group.members.length
                            : 0
                          ).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 md:text-right">
                    <a
                      href={`/groups/${group._id}/summary`}
                      className="inline-block rounded-md border border--[#1DD100] text-[#1DD100] px-5 py-2 text-sm font-medium h-full transition hover:bg-[#1DD100] hover:text-white"
                    >
                      View Summary
                    </a>
                    <Link
                      href={`/groups/${group._id}`}
                      className="inline-block rounded-md bg-[#1DD100] px-5 py-2 text-sm font-semibold text-white h-full transition hover:bg-[#19B300] hover:border-[#19B300]  ml-2"
                    >
                      View Details
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default GroupList;
