-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ai_configs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL DEFAULT 'default',
    "system_prompt" TEXT NOT NULL,
    "temperature" REAL NOT NULL DEFAULT 0.7,
    "max_tokens" INTEGER NOT NULL DEFAULT 800,
    "quick_buttons" TEXT NOT NULL DEFAULT '[]',
    "updated_at" DATETIME NOT NULL,
    "updated_by" TEXT
);
INSERT INTO "new_ai_configs" ("id", "key", "max_tokens", "system_prompt", "temperature", "updated_at", "updated_by") SELECT "id", "key", "max_tokens", "system_prompt", "temperature", "updated_at", "updated_by" FROM "ai_configs";
DROP TABLE "ai_configs";
ALTER TABLE "new_ai_configs" RENAME TO "ai_configs";
CREATE UNIQUE INDEX "ai_configs_key_key" ON "ai_configs"("key");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
