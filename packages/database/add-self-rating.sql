ALTER TABLE "PerformanceAgreement" ADD COLUMN IF NOT EXISTS "selfRating" INTEGER;
ALTER TABLE "PerformanceAgreement" ADD COLUMN IF NOT EXISTS "selfRatedAt" TIMESTAMP(3);
