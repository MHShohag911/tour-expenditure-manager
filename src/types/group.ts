export type Deposit = {
  id: string;
  memberName: string;
  amount: number;
  description: string;
  createdAt: string;
  sequence: number;
  paidTo?: string;
};

export type AccountTransaction = {
  id: string;
  type: "deposit" | "expense_deduction" | "expense_credit" | "settlement" | "debt_netting";
  amount: number;
  description: string;
  createdAt: string;
  sequence: number;
  relatedExpenseId?: string;
  relatedDepositId?: string;
  relatedMemberName?: string;
  balanceAfter: number;     // available A/C after
  creditAfter: number;      // receivable after
};

export type OutstandingDebt = {
  id: string;
  expenseId: string;
  fromMember: string;
  toMember: string;
  originalAmount: number;
  settledAmount: number;
  createdAt: string;
  sequence: number;
};

export type Member = {
  name: string;
  totalPaid: number;
  totalOwed: number;
  accountBalance: number;         // available A/C only
  accountTransactions: AccountTransaction[];
};

export type Expense = {
  id?: string;
  description: string;
  amount: number;
  payerName: string;
  time: string;
  createdAt?: string;
  sequence?: number;
  shares?: { memberName: string; amount: number; note?: string }[];
};

export type Group = {
  _id: string;
  name: string;
  isDisabled: boolean;
  isFinished?: boolean;
  members: Member[];
  expenses: Expense[];
  deposits?: Deposit[];
  outstandingDebts?: OutstandingDebt[];
  // settlements?: Settlement[];
  nextSequence?: number;
};