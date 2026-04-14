/*
  Warnings:

  - You are about to drop the `feedbacks` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `user_feedback` on the `conversations` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "feedbacks_user_session_id_idx";

-- DropIndex
DROP INDEX "feedbacks_feedback_idx";

-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "feedbacks";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "admin_users" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    "role_id" INTEGER NOT NULL,
    CONSTRAINT "admin_users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "roles" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "code" TEXT NOT NULL,
    "display_name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "role_id" INTEGER NOT NULL,
    "permission_id" INTEGER NOT NULL,
    CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ai_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL DEFAULT 'default',
    "system_prompt" TEXT NOT NULL,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "max_tokens" INTEGER NOT NULL DEFAULT 800,
    "updated_at" DATETIME NOT NULL,
    "updated_by" TEXT
);

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
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_identity_id" INTEGER,
    CONSTRAINT "conversations_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_conversations" ("ai_model", "bot_response", "created_at", "id", "messages", "session_id", "timestamp", "updated_at", "user_identity_id", "user_message", "user_name") SELECT "ai_model", "bot_response", "created_at", "id", "messages", "session_id", "timestamp", "updated_at", "user_identity_id", "user_message", "user_name" FROM "conversations";
DROP TABLE "conversations";
ALTER TABLE "new_conversations" RENAME TO "conversations";
CREATE UNIQUE INDEX "conversations_session_id_key" ON "conversations"("session_id");
CREATE INDEX "conversations_session_id_idx" ON "conversations"("session_id");
CREATE INDEX "conversations_user_identity_id_idx" ON "conversations"("user_identity_id");
CREATE TABLE "new_user_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "user_name" TEXT,
    "last_seen" TEXT NOT NULL,
    "admin_controlled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_identity_id" INTEGER,
    CONSTRAINT "user_sessions_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_user_sessions" ("created_at", "id", "last_seen", "session_id", "user_identity_id", "user_name") SELECT "created_at", "id", "last_seen", "session_id", "user_identity_id", "user_name" FROM "user_sessions";
DROP TABLE "user_sessions";
ALTER TABLE "new_user_sessions" RENAME TO "user_sessions";
CREATE UNIQUE INDEX "user_sessions_session_id_key" ON "user_sessions"("session_id");
CREATE INDEX "user_sessions_user_identity_id_idx" ON "user_sessions"("user_identity_id");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "admin_users_email_key" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_email_idx" ON "admin_users"("email");

-- CreateIndex
CREATE INDEX "admin_users_role_id_idx" ON "admin_users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_key" ON "roles"("name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_code_key" ON "permissions"("code");

-- CreateIndex
CREATE INDEX "permissions_module_idx" ON "permissions"("module");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "ai_configs_key_key" ON "ai_configs"("key");
