CREATE INDEX IF NOT EXISTS "chat_messages_user_id_created_at_idx" ON "chat_messages"("user_id", "created_at");
