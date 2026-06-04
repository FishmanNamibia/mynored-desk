export class Employee {
  id!: string;
  firstName!: string;
  lastName!: string;
  email!: string;
  phone?: string;
  departmentId!: string;
  position!: string;
  startDate!: Date;
  managerId?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
