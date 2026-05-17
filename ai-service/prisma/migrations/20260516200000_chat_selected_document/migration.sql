-- Persist per-session document focus for scoped chat answers
ALTER TABLE "chat_sessions" ADD COLUMN IF NOT EXISTS "selected_document_id" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chat_sessions_selected_document_id_fkey'
  ) THEN
    ALTER TABLE "chat_sessions"
      ADD CONSTRAINT "chat_sessions_selected_document_id_fkey"
      FOREIGN KEY ("selected_document_id") REFERENCES "documents"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "chat_sessions_selected_document_id_idx" ON "chat_sessions"("selected_document_id");
