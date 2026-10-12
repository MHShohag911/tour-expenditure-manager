import Swal from "sweetalert2";
import { axiosSecure } from "../hooks/useAxiosSecure";
import type { Group, Expense, ExtraCharge } from "@/types/group";

type ExpenseListProps = {
  groupId: string;
  groups: Group[];
  group: Group;
  expenses: Expense[];
  expenseId: string;
  extraCharges: ExtraCharge[];
  onRefresh: () => Promise<void>;
};


const ExpenseList = ({
  groupId,
  groups,
  group,
  expenses,
  expenseId,
  extraCharges,
  onRefresh,
}: ExpenseListProps) => {

  const handleDelete = async (index: number) => {
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

      if (result.isConfirmed) {
        // Delete expense from DB
        await axiosSecure.delete(
          `/teamDB/${groupId}/removeExpenseByIndex`,
          { params: { index } }
        );
        Swal.fire({
          title: "Deleted!",
          text: "Your file has been deleted.",
          icon: "success",
        });
        await onRefresh();

        // Calculate share to deduct
        const deletedAmount = group.expenses[index].amount;
        const splitAmount = deletedAmount / group.members.length;

        // Create updated group
        const updatedGroup = { ...group };
        updatedGroup.members = updatedGroup.members.map((member) => ({
          ...member,
          totalPaid:
            member.name === group.expenses[index].payerName
              ? member.totalPaid - deletedAmount
              : member.totalPaid,
          totalOwed: member.totalOwed - splitAmount,
        }));

        // Send PATCH request to update group
        await axiosSecure.patch(
          `/teamDB/${groupId}/updatedGroup`,
          updatedGroup
        );
      }
    } catch (err) {
      console.error("Error deleting or updating group:", err);
    }
  };

  return (
    <div className="mt-5 text-black">
      <p className="font-bold text-black">Expense Details:</p>
      <ul>
        {expenses.map((expense, index) => (
          <li className="flex justify-between items-center" key={index}>
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
              onClick={() => handleDelete(index)}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      <p className="font-bold text-black">Extra Charge Details:</p>
      <ul>
        {extraCharges?.map((extraCharge, index) => (
          <li className="flex justify-between items-center" key={index}>
            <div className="flex flex-col mt-3">
              <div>
                <span className="font-bold">{index + 1}. </span>
                ৳{extraCharge.extraAmount} - (Paid by {extraCharge.paidBy}{" "}){" "}(OwedBy {extraCharge.owedBy})
              </div>
            </div>
            <button
              type="button"
              className="rounded-md bg-purple-700 px-4 py-2 text-white hover:bg-purple-800"
              onClick={() => handleDelete(index)}
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
