"use client";

import type {
  Group,
  Member,
  Expense,
  ExtraCharge,
} from "@/types/group";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import GroupForm from "@/components/GroupForm";
import GroupList from "@/components/GroupList";
import { NavBar } from "@/components/NavBar";
import Footer from "@/components/Footer";
import useAxiosSecure from "@/hooks/useAxiosSecure";

export default function Home() {
  const [groups, setGroups] = useState<Group[]>([]);
  const axiosSecure = useAxiosSecure();

  const upperCase = useCallback((name: string) => {
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, []);

  const currGroup = useCallback(
    (id: string) => groups.find((group) => group._id === id),
    [groups],
  );

  const addGroup = async (groupName: string) => {
    const name = upperCase(groupName.trim());

    if (!name) return;

    try {
      await axiosSecure.post("/teamDB", {
        name,
        members: [],
        expenses: [],
        extraCharges: [],
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
      await axiosSecure.patch(`/teamDB/${groupId}/addMember`, {
        name,
        totalPaid: 0,
        totalOwed: 0,
      });

      const response = await axiosSecure.get<Group[]>("/teamDB");
      setGroups(response.data);
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

  const newExpense: Expense = {
    description: upperCase(description),
    amount: Number(amount),
    payerName,
    time: currentDateTime,
  };

  const newExpenses = [...currentGroup.expenses, newExpense];

  // Calculate each member's equal share of all group expenses.
  const total = newExpenses.reduce(
    (sum, expense) => sum + Number(expense.amount),
    0,
  );

  const splitAmount = total / currentGroup.members.length;

  const updatedMembers = currentGroup.members.map((member) => ({
    ...member,
    totalOwed: splitAmount,
    totalPaid:
      member.name.toLowerCase() === payerName.toLowerCase()
        ? (member.totalPaid || 0) + Number(amount)
        : member.totalPaid || 0,
  }));

  // Prepare the complete updated group for the API.
  const updatedGroup = {
    ...currentGroup,
    members: updatedMembers,
    expenses: newExpenses,
  };

  try {
    await axiosSecure.put(
      `/teamDB/${groupId}/group`,
      updatedGroup,
    );

    const response = await axiosSecure.get<Group[]>("/teamDB");
    setGroups(response.data);

    await Swal.fire(
      "Expense added!",
      "The expense has been saved successfully.",
      "success",
    );
  } catch (error) {
    console.error("Failed to add expense:", error);

    await Swal.fire(
      "Error",
      "Could not save the expense.",
      "error",
    );
  }
};


  const handleSetGroup = async (groupId: string) => {
    const group = currGroup(groupId);

    if (!group) return;

    if (group.members.length <= 1) {
      await Swal.fire({
        icon: "error",
        title: "Add Members",
        text: "Please add at least two group members.",
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
        });
      }

      const groupsResponse = await axiosSecure.get<Group[]>("/teamDB");
      setGroups(groupsResponse.data);
    } catch (error) {
      console.error("Failed to set group:", error);
      Swal.fire("Error", "Could not set the group.", "error");
    }
  };

  const addExtraCharge = async (
    groupId: string,
    extraAmount: number,
    paidBy: string,
    owedBy: string,
  ) => {
    const currentGroup = currGroup(groupId);

    if (!currentGroup) return;

    const amount = Number(extraAmount);

    if (!Number.isFinite(amount) || amount <= 0) {
      await Swal.fire("Invalid amount", "Enter a valid amount.", "warning");
      return;
    }

    const payer = currentGroup.members.find(
      (member) => member.name === paidBy,
    );
    const lender = currentGroup.members.find(
      (member) => member.name === owedBy,
    );

    if (!payer || !lender) {
      await Swal.fire(
        "Member not found",
        "Please select valid group members.",
        "error",
      );
      return;
    }

    try {
      // Save the extra charge.
      await axiosSecure.patch(`/teamDB/${groupId}/extraCharge`, {
        extraAmount: amount,
        paidBy,
        owedBy,
      });

      // Update balances by the amount of this new charge.
      await axiosSecure.patch(`/groups/${groupId}/updatePayment`, {
        paidBy,
        payerAmount: amount,
        owedBy,
        lenderAmount: amount,
      });

      const response = await axiosSecure.get<Group[]>("/teamDB");
      setGroups(response.data);
    } catch (error) {
      console.error("Failed to add extra charge:", error);
      Swal.fire("Error", "Could not save the extra charge.", "error");
    }
  };

  useEffect(() => {
    let cancelled = false;

    const fetchGroups = async () => {
      try {
        const response = await axiosSecure.get<Group[]>("/teamDB");

        if (!cancelled) {
          setGroups(response.data);
        }
      } catch (error) {
        console.error("Failed to load groups:", error);

        if (!cancelled) {
          Swal.fire("Error", "Could not load your groups.", "error");
        }
      }
    };

    void fetchGroups();

    return () => {
      cancelled = true;
    };
  }, [axiosSecure]);

  return (
    <div className="container mx-auto flex min-h-screen flex-col px-4">
      <NavBar />

      <main className="min-h-screen flex-1">
        <p className="my-10 text-center text-3xl font-bold">
          Tour Expenditure Manager
        </p>

        <GroupForm onAddGroup={addGroup} />

        <GroupList
          groups={groups}
          setGroups={setGroups}
          onAddMember={addMember}
          onAddExpense={addExpense}
          handleSetGroup={handleSetGroup}
          onAddExtraCharge={addExtraCharge}
        />
      </main>

      <Footer />
    </div>
  );
}
