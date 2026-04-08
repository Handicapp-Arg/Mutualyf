-- CreateTable
CREATE TABLE "user_identities" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "ip_address" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "user_name" TEXT,
    "user_agent" TEXT,
    "timezone" TEXT,
    "language" TEXT,
    "first_visit" TEXT NOT NULL,
    "last_visit" TEXT NOT NULL,
    "visit_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "user_message" TEXT NOT NULL,
    "bot_response" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "ai_model" TEXT,
    "user_feedback" BOOLEAN,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "user_name" TEXT,
    "last_seen" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "feedback" TEXT NOT NULL,
    "user_message" TEXT,
    "bot_response" TEXT,
    "user_session_id" TEXT,
    "ip" TEXT,
    "user_name" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "user_identities_fingerprint_key" ON "user_identities"("fingerprint");

-- CreateIndex
CREATE INDEX "conversations_session_id_idx" ON "conversations"("session_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_sessions_session_id_key" ON "user_sessions"("session_id");

-- CreateIndex
CREATE INDEX "feedbacks_feedback_idx" ON "feedbacks"("feedback");

-- CreateIndex
CREATE INDEX "feedbacks_user_session_id_idx" ON "feedbacks"("user_session_id");
