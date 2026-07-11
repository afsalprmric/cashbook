import Dexie, { type Table } from 'dexie';

export interface Transaction {
  id?: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  date: string; // ISO string for easier querying
  paymentModeId: string;
  note: string;
  attachmentUrl?: string; // base64 or blob URL
  createdAt: number;
  updatedAt: number;
}

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  isDefault?: boolean;
}

export interface PaymentMode {
  id: string;
  name: string;
  isDefault?: boolean;
}

export interface LoanRepayment {
  id: string;
  date: string;
  amount: number;
  note: string;
  type?: 'given' | 'received';
}

export interface Loan {
  id: string;
  type: 'lent' | 'borrowed';
  amount: number;
  payeeName: string;
  payeePhone: string;
  date: string;
  status: 'pending' | 'settled';
  note: string;
  repayments?: LoanRepayment[];
  createdAt: number;
  updatedAt: number;
}

export interface Fund {
  id: string;
  name: string;
  type: 'primary_fund' | 'secondary_account';
  balance: number;
  updatedAt: number;
}

export interface Investment {
  id: string;
  name: string;
  type: 'savings' | 'investment';
  amountInvested: number;
  currentValue: number;
  startDate: string;
  maturityDate?: string;
  status: 'active' | 'closed';
  note?: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreditCard {
  id: string;
  name: string;
  bankName: string;
  creditLimit: number;
  currentOutstanding: number;
  statementDay: number;
  dueDay: number;
  createdAt: number;
  updatedAt: number;
}

export interface EMIPayment {
  id: string;
  date: string;
  amount: number;
  note: string;
}

export interface EMI {
  id: string;
  itemName: string;
  emiAmount: number;
  totalMonths: number;
  monthsPaid: number;
  startDate: string;
  linkedCardId?: string;
  status: 'active' | 'completed';
  payments?: EMIPayment[];
  createdAt: number;
  updatedAt: number;
}

export class CashbookDB extends Dexie {
  transactions!: Table<Transaction, string>;
  categories!: Table<Category, string>;
  paymentModes!: Table<PaymentMode, string>;
  loans!: Table<Loan, string>;
  funds!: Table<Fund, string>;
  investments!: Table<Investment, string>;
  creditCards!: Table<CreditCard, string>;
  emis!: Table<EMI, string>;

  constructor() {
    super('CashbookDatabase');
    
    // Define tables and indices
    this.version(1).stores({
      transactions: 'id, type, categoryId, date, paymentModeId',
      categories: 'id, name, type',
      paymentModes: 'id, name'
    });

    this.version(2).stores({
      transactions: 'id, type, categoryId, date, paymentModeId',
      categories: 'id, name, type',
      paymentModes: 'id, name',
      loans: 'id, type, status, date'
    });

    this.version(3).stores({
      transactions: 'id, type, categoryId, date, paymentModeId',
      categories: 'id, name, type',
      paymentModes: 'id, name',
      loans: 'id, type, status, date',
      funds: 'id, type, name'
    });

    this.version(4).stores({
      transactions: 'id, type, categoryId, date, paymentModeId',
      categories: 'id, name, type',
      paymentModes: 'id, name',
      loans: 'id, type, status, date',
      funds: 'id, type, name',
      investments: 'id, type, status, startDate'
    });

    this.version(5).stores({
      transactions: 'id, type, categoryId, date, paymentModeId',
      categories: 'id, name, type',
      paymentModes: 'id, name',
      loans: 'id, type, status, date',
      funds: 'id, type, name',
      investments: 'id, type, status, startDate',
      creditCards: 'id, name, bankName',
      emis: 'id, status, startDate, linkedCardId'
    });

    // Version 6: Add createdAt index to creditCards and emis for reliable sorting
    this.version(6).stores({
      transactions: 'id, type, categoryId, date, paymentModeId',
      categories: 'id, name, type',
      paymentModes: 'id, name',
      loans: 'id, type, status, date',
      funds: 'id, type, name',
      investments: 'id, type, status, startDate',
      creditCards: 'id, name, bankName, createdAt',
      emis: 'id, status, startDate, linkedCardId, createdAt'
    });
  }
}

export const db = new CashbookDB();

// Initial seeding of data if empty
export const seedDatabase = async () => {
  const categoryCount = await db.categories.count();
  if (categoryCount === 0) {
    const defaultExpenseCategories = [
      'Entertainment', 'Travel', 'Food & Dining', 'Vehicle Maintenance', 
      'Groceries', 'Shopping', 'Gadgets & Electronics', 'Clothing', 
      'Health & Beauty', 'Mobile & Utilities', 'Charity', 
      'Education & Career', 'Loan', 'Miscellaneous'
    ];
    
    const categoriesToInsert: Category[] = defaultExpenseCategories.map(name => ({
      id: crypto.randomUUID(),
      name,
      type: 'expense',
      isDefault: true
    }));

    // Add Income categories
    categoriesToInsert.push(
      { id: crypto.randomUUID(), name: 'Salary', type: 'income', isDefault: true },
      { id: crypto.randomUUID(), name: 'Business Income', type: 'income', isDefault: true },
      { id: crypto.randomUUID(), name: 'Bonus', type: 'income', isDefault: true },
      { id: crypto.randomUUID(), name: 'Savings / Returns', type: 'income', isDefault: true },
      { id: crypto.randomUUID(), name: 'Gifts / Donations', type: 'income', isDefault: true },
      { id: crypto.randomUUID(), name: 'Other Income', type: 'income', isDefault: true }
    );

    await db.categories.bulkAdd(categoriesToInsert);

    const defaultPaymentModes: PaymentMode[] = [
      { id: crypto.randomUUID(), name: 'Cash', isDefault: true },
      { id: crypto.randomUUID(), name: 'Bank Transfer', isDefault: true },
      { id: crypto.randomUUID(), name: 'Credit Card', isDefault: true },
      { id: crypto.randomUUID(), name: 'UPI', isDefault: true },
    ];
    await db.paymentModes.bulkAdd(defaultPaymentModes);
  }
};
