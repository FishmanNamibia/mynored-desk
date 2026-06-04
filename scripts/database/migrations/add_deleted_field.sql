-- Add deleted field to Refreshment table
ALTER TABLE "Refreshment" ADD COLUMN "deleted" BOOLEAN DEFAULT false;

-- Create index for better performance
CREATE INDEX "Refreshment_deleted_idx" ON "Refreshment"("deleted");
