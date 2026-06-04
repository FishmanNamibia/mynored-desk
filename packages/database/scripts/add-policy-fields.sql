-- Check if columns exist and add them if they don't
DO $$ 
BEGIN
    -- Add signedDate column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PolicyDocument' AND column_name = 'signedDate'
    ) THEN
        ALTER TABLE "PolicyDocument" ADD COLUMN "signedDate" TEXT;
        RAISE NOTICE 'Added signedDate column';
    ELSE
        RAISE NOTICE 'signedDate column already exists';
    END IF;

    -- Add reviewDate column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PolicyDocument' AND column_name = 'reviewDate'
    ) THEN
        ALTER TABLE "PolicyDocument" ADD COLUMN "reviewDate" TEXT;
        RAISE NOTICE 'Added reviewDate column';
    ELSE
        RAISE NOTICE 'reviewDate column already exists';
    END IF;

    -- Add status column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'PolicyDocument' AND column_name = 'status'
    ) THEN
        ALTER TABLE "PolicyDocument" ADD COLUMN "status" TEXT;
        RAISE NOTICE 'Added status column';
    ELSE
        RAISE NOTICE 'status column already exists';
    END IF;
END $$;

-- Show current table structure
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'PolicyDocument'
ORDER BY ordinal_position;
