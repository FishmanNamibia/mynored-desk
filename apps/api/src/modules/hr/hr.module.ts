import { Module } from "@nestjs/common";
import { OnboardingController } from "./onboarding/onboarding.controller";
import { LeaveController } from "./leave/leave.controller";
import { VacanciesController } from "./vacancies/vacancies.controller";
import { VacanciesService } from "./vacancies/vacancies.service";
import { OnboardingService } from "./onboarding/onboarding.service";
import { LeaveService } from "./leave/leave.service";

@Module({
  controllers: [OnboardingController, LeaveController, VacanciesController],
  providers: [OnboardingService, LeaveService, VacanciesService],
  exports: [OnboardingService, LeaveService],
})
export class HrModule {}
