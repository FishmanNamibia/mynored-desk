export class Vacancy {
  id!: string;
  title!: string;
  description!: string;
  departmentId!: string;
  requirements?: string;
  salary?: number;
  closingDate?: Date;
  status!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
