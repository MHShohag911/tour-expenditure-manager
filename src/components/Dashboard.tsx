"use client";

import type { Group } from "@/types/group";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import GroupForm from "@/components/GroupForm";
import GroupList from "@/components/GroupList";
import useAxiosSecure from "@/hooks/useAxiosSecure";
import Link from "next/link";

type MutateResponse = { message: string; group?: Group };

export default function Dashboard() {
  const [groups, setGroups] = useState<Group[]>([]);
  // ...
  const axiosSecure = useAxiosSecure();

    useEffect(() => {
    const fetchGroups = async () => {
      try {
        const response = await axiosSecure.get<Group[]>("/teamDB");
        setGroups(response.data);
      } catch (error) {
        console.error("Failed to load groups:", error);
      }
    };

    fetchGroups();
  }, [axiosSecure]);

  const upperCase = useCallback((name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, []);

  const currGroup = useCallback(
    (id: string) => groups.find((group) => group._id === id),
    [groups],
  );

  const applyGroupUpdate = useCallback((group: Group | undefined) => {
    if (!group) return;
    setGroups((previous) =>
      previous.map((g) => (g._id === group._id ? group : g)),
    );
  }, []);

    const refreshGroups = async () => {
    const response = await axiosSecure.get<Group[]>("/teamDB");
    setGroups(response.data);
  };

  const addGroup = async (groupName: string) => {
    const name = upperCase(groupName.trim());

    if (!name) return;

    try {
      await axiosSecure.post("/teamDB", {
        name,
        members: [],
        expenses: [],
        isDisabled: false,
      });

      const response = await axiosSecure.get<Group[]>("/teamDB");
      setGroups(response.data);
    } catch (error) {
      console.error("Failed to add group:", error);
      Swal.fire("Error", "Could not create the group.", "error");
    }
  };

  const addMember = async (groupId: string, memberName: string) => {
    const currentGroup = currGroup(groupId);

    if (!currentGroup) return;

    const name = upperCase(memberName.trim());

    if (!name) return;

    if (
      currentGroup.members.some(
        (member) => member.name.toLowerCase() === name.toLowerCase(),
      )
    ) {
      await Swal.fire({
        icon: "error",
        title: "Already added",
        text: "The name is already in the group.",
      });
      return;
    }

    try {
      const response = await axiosSecure.patch<MutateResponse>(
        `/teamDB/${groupId}/addMember`,
        { name, totalPaid: 0, totalOwed: 0 },
      );
      applyGroupUpdate(response.data.group);
    } catch (error) {
      console.error("Failed to add member:", error);
      Swal.fire("Error", "Could not add the member.", "error");
    }
  };

  const addExpense = async (
    groupId: string,
    description: string,
    amount: number,
    payerName: string,
    currentDateTime: string,
    shares: { memberName: string; amount: number }[],
  ) => {
    const currentGroup = currGroup(groupId);

    if (!currentGroup) return;

    if (currentGroup.members.length === 0) {
      await Swal.fire(
        "Add members first",
        "Add at least one member before recording an expense.",
        "warning",
      );
      return;
    }

    try {
      const response = await axiosSecure.post<MutateResponse>(
        `/teamDB/${groupId}/expenses`,
        {
          description: upperCase(description),
          amount: Number(amount),
          payerName,
          time: currentDateTime,
          shares,
        },
      );
      applyGroupUpdate(response.data.group);

      await Swal.fire({
        icon: "success",
        title: "Expense added!",
        text: "The expense has been saved successfully.",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      console.error("Failed to add expense:", error);

      await Swal.fire("Error", "Could not save the expense.", "error");
    }
  };

  const handleSetGroup = async (groupId: string) => {
    const group = currGroup(groupId);

    if (!group) return;

    if (group.members.length <= 0) {
      await Swal.fire({
        icon: "error",
        title: "Add Members",
        text: "Please add at least one members.",
      });
      return;
    }

    try {
      const response = await axiosSecure.patch(
        `/teamDB/${groupId}/updatedDisabled`,
        { isDisabled: true },
      );

      if (response.data.modifiedCount > 0) {
        await Swal.fire({
          title: "Congrats!",
          text: `${group.name} group has been set.`,
          icon: "success",
          showConfirmButton: false,
          timer: 1500,
        });
      }

      const groupsResponse = await axiosSecure.get<Group[]>("/teamDB");
      setGroups(groupsResponse.data);
    } catch (error) {
      console.error("Failed to set group:", error);
      Swal.fire("Error", "Could not set the group.", "error");
    }
  };

  const addDeposit = async (
    groupId: string,
    memberName: string,
    amount: number,
    description: string,
  ) => {
    try {
      const response = await axiosSecure.post<MutateResponse>(
        `/teamDB/${groupId}/deposits`,
        { memberName, amount, description },
      );
      applyGroupUpdate(response.data.group);

      await Swal.fire({
        title: "Deposit added",
        text: `${memberName} deposited ৳${amount.toFixed(2)}.`,
        icon: "success",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      console.error("Failed to add deposit:", error);
      await Swal.fire("Error", "Could not add the deposit.", "error");
    }
  };

  const handleFinishTour = async (groupId: string) => {
    const group = currGroup(groupId);
    if (!group) return;

    let password = "";

    // If the group has a password set, ask for it
    if (group.lockHash) {
      const { value } = await Swal.fire({
        title: "Password Required",
        text: "This group is password protected. Enter the 6-digit PIN to finish the tour.",
        input: "password",
        inputAttributes: {
          maxlength: "6",
          pattern: "[0-9]*",
          inputmode: "numeric",
        },
        showCancelButton: true,
        confirmButtonText: "Verify",
        confirmButtonColor: "#1DD100",
        inputValidator: (val) => {
          if (!val || val.length !== 6) return "Please enter the 6-digit PIN.";
        },
      });

      if (!value) return;
      password = value;
    }

    const result = await Swal.fire({
      title: "Finish tour?",
      text: "No more expenses or deposits can be added after this.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#111827",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, finish it!",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await axiosSecure.patch<MutateResponse>(
        `/teamDB/${groupId}/finishTour`,
        { password }, // Send the password in the body
      );
      applyGroupUpdate(response.data.group);

      await Swal.fire({
        title: "Tour finished",
        text: `${group.name} has been locked.`,
        icon: "success",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (error) {
      console.error("Failed to finish tour:", error);
      Swal.fire("Error", "Could not finish the tour.", "error");
    }
  };

    return (
    <>
      <div className="my-10 text-center">
        <h1 className="text-3xl font-bold text-gray-900">
          Tour Expenditure Manager
        </h1>
        <p className="mt-2 text-gray-500">
          Manage tour groups, expenses, and shared costs effortlessly.
        </p>
        <Link
          href="/guide"
          className="mt-4 inline-block text-sm font-medium text-[#1DD100] hover:underline"
        >
          Need help? Read the guide →
        </Link>
      </div>

      <GroupForm onAddGroup={addGroup} />

      <GroupList
        groups={groups}
        setGroups={setGroups}
        onAddMember={addMember}
        onAddExpense={addExpense}
        handleSetGroup={handleSetGroup}
        handleFinishTour={handleFinishTour}
        onAddDeposit={addDeposit}
        refreshGroups={refreshGroups}
      />
    </>
  );
}
