// types/memo.types.ts

export interface ThroughPerson {
  name: string;
  title: string;
}

export interface SignatureInfo {
  name: string;
  position: string;
  department?: string;
  signatureDate?: string;
  signed?: boolean;
  signatureImgUrl?: string;
}

export interface MemoFormData {
  // Routing information
  memoTo: string;
  memoToTitle?: string;
  memoThrough: ThroughPerson[];
  memoFrom: string;
  memoFromTitle?: string;
  memoDate: string; // ISO date string
  
  // Signature information
  initiatorSignature?: SignatureInfo;
  throughSignatures?: SignatureInfo[];
  recipientSignature?: SignatureInfo; // PMU/Procurement signature
  financeSignature?: SignatureInfo; // Financial executive signature

  // Subject and content
  subject: string;

  // 1. PURPOSE
  purpose: string;

  // 2. FINANCIAL IMPLICATION
  procurementActivity?: string;
  budgetVote?: string;
  budgetedAmount?: string | number;
  amountSpent?: string | number;
  availableFunds?: string | number;
  executiveName?: string;
  financialVerification?: 'Yes' | 'No' | '';
  budgetApproved?: 'Yes' | 'No' | '';
  financialComments?: string;
  executiveSignatureDate?: string;

  // 3. RECOMMENDATION
  recommendation: string;

  // Meta
  status?: 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED';
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}

export interface Memo extends Omit<MemoFormData, 'memoThrough' | 'budgetedAmount' | 'amountSpent' | 'availableFunds' | 'throughSignatures'> {
  id: string;
  memoThrough: ThroughPerson[];
  budgetedAmount: number | null;
  amountSpent: number | null;
  availableFunds: number | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  executiveSignaturePath?: string | null;
  attachments?: any;
}

export interface MemoAttachment {
  name: string;
  url: string;
  size: number;
  type: string;
}

export interface MemoListItem {
  id: string;
  subject: string;
  memoTo: string;
  memoFrom: string;
  memoDate: string;
  status: string;
  priority: string;
  createdAt: string;
}
