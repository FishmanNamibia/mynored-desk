-- Add deleted field to Refreshment table for soft delete
ALTER TABLE "Refreshment" 
ADD COLUMN IF NOT EXISTS "deleted" BOOLEAN DEFAULT false;

-- Create index for better performance on deleted field
CREATE INDEX IF NOT EXISTS "Refreshment_deleted_idx" 
ON "Refreshment"("deleted");

-- Verify the field was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'Refreshment' AND column_name = 'deleted';
