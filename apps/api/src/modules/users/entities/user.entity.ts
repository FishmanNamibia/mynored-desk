export class User {
  id!: number;
  username!: string;
  email!: string;
  fullName?: string;
  department?: string;
  role!: string;
  createdAt!: Date;
  updatedAt!: Date;
}
