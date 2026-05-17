-- Document lifecycle: indexed (vectors stored) before ready
ALTER TYPE "DocumentStatus" ADD VALUE IF NOT EXISTS 'indexed';

-- Chunk store for audit/reporting and chat fallback
CREATE TABLE IF NOT EXISTS "document_chunks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "document_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "chunk_index" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "qdrant_point_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "document_chunks_document_id_chunk_index_key"
    ON "document_chunks"("document_id", "chunk_index");

CREATE INDEX IF NOT EXISTS "document_chunks_document_id_idx" ON "document_chunks"("document_id");
CREATE INDEX IF NOT EXISTS "document_chunks_user_id_idx" ON "document_chunks"("user_id");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'document_chunks_document_id_fkey'
  ) THEN
    ALTER TABLE "document_chunks"
      ADD CONSTRAINT "document_chunks_document_id_fkey"
      FOREIGN KEY ("document_id") REFERENCES "documents"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
