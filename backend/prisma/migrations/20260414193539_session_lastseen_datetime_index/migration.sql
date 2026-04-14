-- Migrate lastSeen from String (ISO) to DateTime + add index

PRAGMA foreign_keys=OFF;

CREATE TABLE "new_user_sessions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT NOT NULL,
    "user_name" TEXT,
    "last_seen" DATETIME NOT NULL,
    "admin_controlled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "user_identity_id" INTEGER,
    CONSTRAINT "user_sessions_user_identity_id_fkey" FOREIGN KEY ("user_identity_id") REFERENCES "user_identities" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_user_sessions" ("id", "session_id", "user_name", "last_seen", "admin_controlled", "created_at", "user_identity_id")
SELECT "id", "session_id", "user_name", "last_seen", "admin_controlled", "created_at", "user_identity_id"
FROM "user_sessions";

DROP TABLE "user_sessions";
ALTER TABLE "new_user_sessions" RENAME TO "user_sessions";

CREATE UNIQUE INDEX "user_sessions_session_id_key" ON "user_sessions"("session_id");
CREATE INDEX "user_sessions_user_identity_id_idx" ON "user_sessions"("user_identity_id");
CREATE INDEX "user_sessions_last_seen_idx" ON "user_sessions"("last_seen");

PRAGMA foreign_keys=ON;
