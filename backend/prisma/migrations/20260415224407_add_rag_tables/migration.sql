-- CreateTable
CREATE TABLE "knowledge_docs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "title" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'active',
    "tokensTotal" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archived_at" DATETIME
);

-- CreateTable
CREATE TABLE "knowledge_chunks" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "doc_id" INTEGER NOT NULL,
    "ord" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "content_clean" TEXT NOT NULL,
    "tokens" INTEGER NOT NULL,
    "category" TEXT NOT NULL,
    "emb_model" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "knowledge_chunks_doc_id_fkey" FOREIGN KEY ("doc_id") REFERENCES "knowledge_docs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "query_cache" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "query_hash" TEXT NOT NULL,
    "embedding" BLOB NOT NULL,
    "hit_count" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "retrieval_logs" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "session_id" TEXT,
    "query" TEXT NOT NULL,
    "rewritten" TEXT,
    "category" TEXT,
    "top_k" INTEGER NOT NULL,
    "top_score" REAL NOT NULL,
    "chunk_ids" TEXT NOT NULL,
    "latency_ms" INTEGER NOT NULL,
    "intent" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "knowledge_docs_hash_key" ON "knowledge_docs"("hash");

-- CreateIndex
CREATE INDEX "knowledge_docs_category_status_idx" ON "knowledge_docs"("category", "status");

-- CreateIndex
CREATE INDEX "knowledge_docs_status_idx" ON "knowledge_docs"("status");

-- CreateIndex
CREATE INDEX "knowledge_chunks_doc_id_idx" ON "knowledge_chunks"("doc_id");

-- CreateIndex
CREATE INDEX "knowledge_chunks_category_idx" ON "knowledge_chunks"("category");

-- CreateIndex
CREATE UNIQUE INDEX "query_cache_query_hash_key" ON "query_cache"("query_hash");

-- CreateIndex
CREATE INDEX "query_cache_created_at_idx" ON "query_cache"("created_at");

-- CreateIndex
CREATE INDEX "retrieval_logs_created_at_idx" ON "retrieval_logs"("created_at");

-- CreateIndex
CREATE INDEX "retrieval_logs_session_id_idx" ON "retrieval_logs"("session_id");
