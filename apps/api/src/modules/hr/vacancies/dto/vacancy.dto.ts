export class VacancyDto {
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

export { VacancyDto as Vacancy };
