ALTER TABLE "NewConnectionApplication"
  ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'Normal';
