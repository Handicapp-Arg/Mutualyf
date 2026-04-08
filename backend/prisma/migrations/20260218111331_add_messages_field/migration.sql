-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_conversations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "user_name" TEXT,
    "user_message" TEXT NOT NULL,
    "bot_response" TEXT NOT NULL,
    "messages" TEXT,
    "timestamp" TEXT NOT NULL,
    "ai_model" TEXT,
    "user_feedback" BOOLEAN,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_identity_id" INTEGER,
    CONSTRAINT "conversations_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_conversations" ("ai_model", "bot_response", "created_at", "id", "session_id", "timestamp", "user_feedback", "user_identity_id", "user_message", "user_name") SELECT "ai_model", "bot_response", "created_at", "id", "session_id", "timestamp", "user_feedback", "user_identity_id", "user_message", "user_name" FROM "conversations";
DROP TABLE "conversations";
ALTER TABLE "new_conversations" RENAME TO "conversations";
CREATE INDEX "conversations_session_id_idx" ON "conversations"("session_id");
CREATE INDEX "conversations_user_identity_id_idx" ON "conversations"("user_identity_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
