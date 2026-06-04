export class PerformanceResponseDto {
  id!: string;
  employeeId!: string;
  reviewerId!: string;
  reviewPeriod!: string;
  rating!: number;
  comments?: string;
  strengths?: string;
  areasForImprovement?: string;
  createdAt!: Date;
  updatedAt!: Date;
}
