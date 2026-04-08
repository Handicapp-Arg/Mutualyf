-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_conversations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "user_message" TEXT NOT NULL,
    "bot_response" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "ai_model" TEXT,
    "user_feedback" BOOLEAN,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_identity_id" INTEGER,
    CONSTRAINT "conversations_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_conversations" ("ai_model", "bot_response", "created_at", "id", "session_id", "timestamp", "user_feedback", "user_message") SELECT "ai_model", "bot_response", "created_at", "id", "session_id", "timestamp", "user_feedback", "user_message" FROM "conversations";
DROP TABLE "conversations";
ALTER TABLE "new_conversations" RENAME TO "conversations";
CREATE INDEX "conversations_session_id_idx" ON "conversations"("session_id");
CREATE INDEX "conversations_user_identity_id_idx" ON "conversations"("user_identity_id");
CREATE TABLE "new_user_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "user_name" TEXT,
    "last_seen" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_identity_id" INTEGER,
    CONSTRAINT "user_sessions_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_sessions" ("created_at", "id", "last_seen", "session_id", "user_name") SELECT "created_at", "id", "last_seen", "session_id", "user_name" FROM "user_sessions";
DROP TABLE "user_sessions";
ALTER TABLE "new_user_sessions" RENAME TO "user_sessions";
CREATE UNIQUE INDEX "user_sessions_session_id_key" ON "user_sessions"("session_id");
CREATE INDEX "user_sessions_user_identity_id_idx" ON "user_sessions"("user_identity_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "user_identities_ip_address_idx" ON "user_identities"("ip_address");
