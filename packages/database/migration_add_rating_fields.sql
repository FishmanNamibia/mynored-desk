-- Migration: Add rating and evidenceNotes fields to ProjectTask table
-- This ensures rating explanation data is permanently stored and never lost

BEGIN;

-- Add rating field (1-5 star rating for completed tasks)
ALTER TABLE "ProjectTask" ADD COLUMN "rating" INTEGER;

-- Add evidenceNotes field (rating explanation for high ratings 4+)
ALTER TABLE "ProjectTask" ADD COLUMN "evidenceNotes" TEXT;

-- Add comments for documentation
COMMENT ON COLUMN "ProjectTask"."rating" IS '1-5 star rating for completed tasks';
COMMENT ON COLUMN "ProjectTask"."evidenceNotes" IS 'Rating explanation required for high ratings (4+)';

COMMIT;
