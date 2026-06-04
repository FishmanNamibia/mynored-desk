export class Memo {
  id!: string;
  title!: string;
  content!: string;
  authorId!: string;
  status!: string;
  departmentId?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
