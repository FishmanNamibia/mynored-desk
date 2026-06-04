export class Task {
  id!: string;
  title!: string;
  description?: string;
  assigneeId!: string;
  assignerId?: string;
  status!: string;
  dueDate?: Date;
  createdAt!: Date;
  updatedAt!: Date;
}
