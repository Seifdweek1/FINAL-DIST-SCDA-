-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('uploaded', 'queued', 'processing', 'ready', 'failed');

-- AlterTable (nullable first for backfill)
ALTER TABLE "documents" ADD COLUMN "encrypted_path" TEXT;
ALTER TABLE "documents" ADD COLUMN "sha256_hash" TEXT;
ALTER TABLE "documents" ADD COLUMN "status" "DocumentStatus";
ALTER TABLE "documents" ADD COLUMN "updated_at" TIMESTAMP(3);

UPDATE "documents" SET "encrypted_path" = "stored_filename" WHERE "encrypted_path" IS NULL;
UPDATE "documents" SET "sha256_hash" = '' WHERE "sha256_hash" IS NULL;
UPDATE "documents" SET "status" = 'uploaded'::"DocumentStatus" WHERE "status" IS NULL;
UPDATE "documents" SET "updated_at" = "created_at" WHERE "updated_at" IS NULL;

ALTER TABLE "documents" ALTER COLUMN "encrypted_path" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "sha256_hash" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "status" SET NOT NULL;
ALTER TABLE "documents" ALTER COLUMN "status" SET DEFAULT 'uploaded'::"DocumentStatus";
ALTER TABLE "documents" ALTER COLUMN "updated_at" SET NOT NULL;
