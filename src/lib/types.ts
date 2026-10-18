import type { SplitMode } from "./split";

export type Member = { id: string; name: string; upiId: string | null };

export type Expense = {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  date: string;
  category: string;
  splitMode: SplitMode;
  createdBy: string | null;
  createdAt: number;
  updatedAt: number;
  splits: { memberId: string; weight: number; amount: number }[];
};

export type Payment = {
  id: string;
  from: string;
  to: string;
  amount: number;
  date: string;
  note: string | null;
  createdBy: string | null;
  createdAt: number;
};

export type GroupData = {
  id: string;
  name: string;
  currency: string;
  createdAt: number;
  updatedAt: number;
  members: Member[];
  expenses: Expense[];
  payments: Payment[];
};
