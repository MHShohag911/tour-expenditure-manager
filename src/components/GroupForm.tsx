
"use client";

import { useState } from "react";

type GroupFormProps = {
  onAddGroup: (groupName: string) => Promise<void>;
};

export default function GroupForm({ onAddGroup }: GroupFormProps) {
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const name = groupName.trim();

    if (!name || loading) return;

    try {
      setLoading(true);
      await onAddGroup(name);
      setGroupName("");
    } catch (error) {
      console.error("Failed to create group:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3">
      <input
        type="text"
        value={groupName}
        onChange={(event) => setGroupName(event.target.value)}
        placeholder="Enter group name"
        className="min-w-0 flex-1 rounded-lg border px-4 py-2"
        required
      />

      <button
        type="submit"
        disabled={loading}
        className="rounded-lg bg-purple-700 px-5 py-2 text-white disabled:opacity-50"
      >
        {loading ? "Creating..." : "Create Group"}
      </button>
    </form>
  );
}
