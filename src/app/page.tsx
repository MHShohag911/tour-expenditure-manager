/* "use client";

import type { Group } from "@/types/group";
import { useCallback, useEffect, useState } from "react";
import Swal from "sweetalert2";
import GroupForm from "@/components/GroupForm";
import GroupList from "@/components/GroupList";
import { NavBar } from "@/components/NavBar";
import Footer from "@/components/Footer";
import useAxiosSecure from "@/hooks/useAxiosSecure";

type MutateResponse = { message: string; group?: Group };

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

  const applyGroupUpdate = useCallback((group: Group | undefined) => {
    if (!group) return;
    setGroups((previous) =>
      previous.map((g) => (g._id === group._id ? group : g)),
    );
  }, []);

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

    const result = await Swal.fire({
      title: "Finish tour?",
      text: "No more expenses or deposits can be added after this.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#15D8B3",
      cancelButtonColor: "#d33",
      confirmButtonText: "Yes, finish it!",
    });

    if (!result.isConfirmed) return;

    try {
      const response = await axiosSecure.patch<MutateResponse>(
        `/teamDB/${groupId}/finishTour`,
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
      await Swal.fire("Error", "Could not finish the tour.", "error");
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
          handleFinishTour={handleFinishTour}
          onAddDeposit={addDeposit}
        />
      </main>

      <Footer />
    </div>
  );
} */

  export const dynamic = "force-dynamic";
export const revalidate = 0;

  import clientPromise from "@/lib/mongodb";
import Dashboard from "@/components/Dashboard";
import type { Group } from "@/types/group";

const DATABASE_NAME = "Tour-Expenditure-Management-Test";
const COLLECTION_NAME = "TeamDB";

export default async function Page() {
  const client = await clientPromise;
  const groups = await client
    .db(DATABASE_NAME)
    .collection<Group>(COLLECTION_NAME)
    .find({})
    .sort({ _id: -1 })
    .toArray();

  // Convert ObjectId to string for the client component
  const serializedGroups = groups.map((g) => ({
    ...g,
    _id: g._id.toString(),
  }));

  return <Dashboard initialGroups={serializedGroups} />;
}