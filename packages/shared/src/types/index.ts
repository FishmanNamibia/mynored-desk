export type User = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user' | 'hr' | 'manager';
};

export type Memo = {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  status: 'draft' | 'review' | 'approved' | 'archived';
  authorId: string;
};

export type PerformanceReview = {
  id: string;
  userId: string;
  reviewerId: string;
  reviewPeriod: Date;
  score: number;
  feedback: string;
  createdAt: Date;
};

export type Task = {
  id: string;
  title: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'pending' | 'in-progress' | 'completed';
};

export type Event = {
  id: string;
  title: string;
  date: Date;
  location: string;
  description: string;
};

export type LeaveRequest = {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  status: 'pending' | 'approved' | 'rejected';
};