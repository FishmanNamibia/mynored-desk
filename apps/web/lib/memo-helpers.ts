// lib/memo-helpers.ts

export const formatDateForDisplay = (dateString: string): string => {
  if (!dateString) return getTodayDate();
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();
};

export const getTodayDate = (): string => {
  const today = new Date();
  return today.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  }).toUpperCase();
};

export const getTodayISO = (): string => {
  return new Date().toISOString().split('T')[0];
};

export const calculateAvailableFunds = (
  budgeted: string | number,
  spent: string | number
): string => {
  const budgetedNum = parseFloat(String(budgeted)) || 0;
  const spentNum = parseFloat(String(spent)) || 0;
  return (budgetedNum - spentNum).toFixed(2);
};

export const shouldRouteToCouncil = (amount: string | number): boolean => {
  const amountNum = parseFloat(String(amount)) || 0;
  return amountNum > 15000;
};

export const formatCurrency = (amount: string | number | null | undefined): string => {
  if (amount === null || amount === undefined) return 'N$ 0.00';
  const num = parseFloat(String(amount)) || 0;
  return `N$ ${num.toLocaleString('en-NA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

export const validateSignatureFile = (file: File): { valid: boolean; error?: string } => {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'Please upload an image file (PNG, JPG, etc.)' };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { valid: false, error: 'Signature image must be less than 2MB' };
  }

  return { valid: true };
};

export const getStatusColor = (status: string): string => {
  switch (status.toUpperCase()) {
    case 'DRAFT':
      return 'bg-gray-100 text-gray-700';
    case 'PENDING':
      return 'bg-amber-100 text-amber-700';
    case 'APPROVED':
      return 'bg-green-100 text-green-700';
    case 'REJECTED':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

export const getPriorityColor = (priority: string): string => {
  switch (priority.toUpperCase()) {
    case 'LOW':
      return 'bg-gray-100 text-gray-600';
    case 'NORMAL':
      return 'bg-blue-100 text-blue-700';
    case 'HIGH':
      return 'bg-orange-100 text-orange-700';
    case 'URGENT':
      return 'bg-red-100 text-red-700';
    default:
      return 'bg-gray-100 text-gray-600';
  }
};
