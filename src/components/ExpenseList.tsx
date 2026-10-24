import Swal from "sweetalert2";
import { axiosSecure } from "../hooks/useAxiosSecure";
import type { Group, Expense } from "@/types/group";

type ExpenseListProps = {
  groupId: string;
  groups: Group[];
  group: Group;
  expenses: Expense[];
  expenseId: string;
  onRefresh: () => Promise<void>;
};

const ExpenseList = ({
  groupId,
  expenses,
  onRefresh,
}: ExpenseListProps) => {
  const handleDelete = async (expense: Expense) => {
    console.log(expense)
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
        confirmButtonColor: "#3085d6",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes, delete it!",
      });

      if (!result.isConfirmed) return;

      await axiosSecure.delete(
        `/teamDB/${groupId}/removeExpenseById`,
        { params: { expenseId: expense.id } }
      );

      await onRefresh();

      await Swal.fire({
        title: "Deleted!",
        text: "The expense has been deleted.",
        icon: "success",
        showConfirmButton: false,
        timer: 1500
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
        {expenses.map((expense, index) => (
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
            <button
              type="button"
              className="rounded-md bg-purple-700 px-4 py-2 text-white hover:bg-purple-800"
              onClick={() => handleDelete(expense)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ExpenseList;