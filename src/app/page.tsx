"use client";

import type {
  Group,
  Expense,
  ExpenseItem
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
    shares: { memberName: string; amount: number }[],
    items: ExpenseItem[],
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

    const itemsTotal = items.reduce(
      (sum, item) => sum + Number(item.amount),
      0,
    );

    const sharedAmount = Number(amount) - itemsTotal;
    console.log("DEBUG expense:", {
      amount,
      itemsTotal,
      sharedAmount,
      shares,
      items,
    });

    if (sharedAmount < 0) {
      await Swal.fire(
        "Invalid expense",
        "Individual item amounts cannot exceed the total expense amount.",
        "warning",
      );
      return;
    }

    const newExpense: Expense = {
      description: upperCase(description),
      amount: Number(amount),
      payerName,
      time: currentDateTime,
      ...(shares.length > 0 ? { shares } : {}),
      ...(items.length > 0 ? { items } : {}),
    };

    const newExpenses = [
      ...(currentGroup.expenses ?? []),
      newExpense,
    ];

    const members = currentGroup.members;
    const extraCharges = currentGroup.extraCharges ?? [];

    const updatedMembers = members.map((member) => {
      // Recalculate the total amount paid by this member.
      const totalPaidFromExpenses = newExpenses.reduce(
        (sum, expense) =>
          expense.payerName.toLowerCase() ===
            member.name.toLowerCase()
            ? sum + Number(expense.amount)
            : sum,
        0,
      );

      // Recalculate this member's share of all expenses.
      const totalOwedFromExpenses = newExpenses.reduce(
        (sum, expense) => {
          const expenseItems = expense.items ?? [];

          const expenseItemsTotal = expenseItems.reduce(
            (itemSum, item) =>
              itemSum + Number(item.amount),
            0,
          );

          const expenseSharedAmount =
            Number(expense.amount) - expenseItemsTotal;

          let memberSharedAmount: number;

          if (expense.shares && expense.shares.length > 0) {
            // Preserve saved custom shares.
            memberSharedAmount = expense.shares.reduce(
              (shareSum, share) =>
                share.memberName.toLowerCase() ===
                  member.name.toLowerCase()
                  ? shareSum + Number(share.amount)
                  : shareSum,
              0,
            );
          } else {
            // Equal split of the shared portion only.
            memberSharedAmount =
              members.length > 0
                ? expenseSharedAmount / members.length
                : 0;
          }

          // Add only the individual items assigned to this member.
          const memberItemAmount = expenseItems.reduce(
            (itemSum, item) => {
              if (item.owedBy.length === 0) {
                return itemSum;
              }

              const isResponsible = item.owedBy.some(
                (name) =>
                  name.toLowerCase() ===
                  member.name.toLowerCase(),
              );

              return isResponsible
                ? itemSum +
                Number(item.amount) / item.owedBy.length
                : itemSum;
            },
            0,
          );

          return sum + memberSharedAmount + memberItemAmount;
        },
        0,
      );

      // Preserve existing extra-charge calculations.
      const totalPaidFromExtraCharges = extraCharges.reduce(
        (sum, charge) =>
          charge.paidBy.toLowerCase() ===
            member.name.toLowerCase()
            ? sum + Number(charge.extraAmount)
            : sum,
        0,
      );

      const totalOwedFromExtraCharges = extraCharges.reduce(
        (sum, charge) =>
          charge.owedBy.toLowerCase() ===
            member.name.toLowerCase()
            ? sum + Number(charge.extraAmount)
            : sum,
        0,
      );

      return {
        ...member,
        totalPaid:
          totalPaidFromExpenses + totalPaidFromExtraCharges,
        totalOwed:
          totalOwedFromExpenses + totalOwedFromExtraCharges,
      };
    });

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

      const response =
        await axiosSecure.get<Group[]>("/teamDB");

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
        />
      </main>

      <Footer />
    </div>
  );
}
