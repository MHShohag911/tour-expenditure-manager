import Swal from "sweetalert2";
import { axiosSecure } from "../hooks/useAxiosSecure";
import type { Group, Expense } from "@/types/group";
import { useState } from "react";

type ExpenseListProps = {
  groupId: string;
  groups: Group[];
  group: Group;
  expenses: Expense[];
  expenseId: string;
  isFinished?: boolean;
  onRefresh: () => Promise<void>;
};

const ExpenseList = ({
  groupId,
  expenses,
  isFinished,
  onRefresh,
}: ExpenseListProps) => {
  const [showAll, setShowAll] = useState(false);
  const handleDelete = async (expense: Expense) => {
    if (!expense.id) {
      await Swal.fire({
        title: "Cannot delete",
        text: "This expense has no ID yet. Add a new expense first to migrate old ones.",
        icon: "error",
      });
      return;
    }

    try {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "You won't be able to revert this!",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#15D8B3",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!",
      });

      if (!result.isConfirmed) return;

      await axiosSecure.delete(`/teamDB/${groupId}/removeExpenseById`, {
        params: { expenseId: expense.id },
      });

      await onRefresh();

      await Swal.fire({
        title: "Deleted!",
        text: "The expense has been deleted.",
        icon: "success",
        showConfirmButton: false,
        timer: 1500,
      });
    } catch (err) {
      console.error("Error deleting expense:", err);
      await Swal.fire({
        title: "Error",
        text: "Could not delete the expense.",
        icon: "error",
      });
    }
  };

  return (
    <div className="mt-5 text-black">
      <p className="font-bold text-black">Expense Details:</p>
      <ul>
        {(showAll ? expenses : expenses.slice(0, 5)).map((expense, index) => (
          <li
            className="flex justify-between items-center"
            key={expense.id ?? `${expense.description}-${expense.time}`}
          >
            <div className="flex flex-col mt-3">
              <div>
                <span className="font-bold">{index + 1}. </span>
                {expense.description} - ৳{expense.amount} (Paid by{" "}
                {expense.payerName})
              </div>
              <span className="text-xs ml-4 text-gray-600">{expense.time}</span>
            </div>
            {!isFinished && (
              <button
                type="button"
                className="rounded-md bg-purple-700 px-4 py-2 text-white hover:bg-purple-800"
                disabled={Boolean(isFinished)}
                onClick={() => handleDelete(expense)}
              >
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
            {expenses.length > 5 && (
        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setShowAll(!showAll)}
            className="rounded-md border border-[#090040] px-4 py-2 text-sm text-[#090040] transition hover:bg-[#090040] hover:text-white"
          >
            {showAll ? "Show Less" : `View All ${expenses.length} Expenses`}
          </button>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
