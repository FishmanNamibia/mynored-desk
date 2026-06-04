export class Leave {
  id!: string;
  userId!: string;
  startDate!: Date;
  endDate!: Date;
  reason?: string;
  status!: string;
}
