export type Member = {
  name: string;
  totalPaid: number;
  totalOwed: number;
};

export type Expense = {
  id: string;
  description: string;
  amount: number;
  payerName: string;
  time: string;
  shares?: {
    memberName: string;
    amount: number;
  }[];
};


export type ExtraCharge = {
  extraAmount: number;
  paidBy: string;
  owedBy: string;
};

export type Group = {
  _id: string;
  name: string;
  isDisabled: boolean;
  isFinished?: boolean;
  members: Member[];
  expenses: Expense[];
};
