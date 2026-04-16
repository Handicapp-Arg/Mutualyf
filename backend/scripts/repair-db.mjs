#!/usr/bin/env node
// Repara la DB cuando hay corrupcion a nivel de pagina en sqlite-vec/FTS5.
// Pasos:
//   1. PRAGMA integrity_check (informativo)
//   2. DROP de tablas vec/FTS corruptas + sus shadow tables
//   3. DELETE de docs orphan (KnowledgeDoc con 0 chunks de ingestas fallidas)
//   4. VACUUM (reescribe TODO el archivo desde cero, repara paginas dañadas)
//
// Backend DEBE estar parado antes de correr esto.

import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = resolve(__dirname, "..", "prisma", "data", "chat.db");

console.log(`[repair] Opening ${DB_PATH}`);
const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");
db.pragma("busy_timeout = 5000");

try {
  sqliteVec.load(db);
  console.log("[repair] sqlite-vec loaded");
} catch (e) {
  console.warn(`[repair] sqlite-vec load failed: ${e.message}`);
}

console.log("\n[repair] PRAGMA integrity_check (puede tardar):");
try {
  const rows = db.pragma("integrity_check");
  for (const r of rows.slice(0, 10)) console.log("  ", r);
  if (rows.length > 10) console.log(`   ... y ${rows.length - 10} mas`);
} catch (e) {
  console.warn(`  integrity_check failed: ${e.message}`);
}

const TABLES = ["kb_vec_v2", "kb_fts_v2", "kb_vec_v1", "kb_fts"];
console.log("\n[repair] Drop tablas vec/FTS:");
for (const t of TABLES) {
  try {
    db.exec(`DROP TABLE IF EXISTS ${t};`);
    console.log(`  dropped ${t}`);
  } catch (e) {
    console.warn(`  could not drop ${t}: ${e.message}`);
  }
}

console.log("\n[repair] Borrando docs orphan (0 chunks):");
try {
  const orphans = db.prepare(`
    SELECT d.id, d.title FROM knowledge_docs d
    LEFT JOIN knowledge_chunks c ON c.doc_id = d.id
    GROUP BY d.id HAVING COUNT(c.id) = 0
  `).all();
  console.log(`  encontrados: ${orphans.length}`);
  for (const o of orphans) console.log(`    - id=${o.id} "${o.title}"`);
  if (orphans.length > 0) {
    db.prepare(`
      DELETE FROM knowledge_docs WHERE id IN (
        SELECT d.id FROM knowledge_docs d
        LEFT JOIN knowledge_chunks c ON c.doc_id = d.id
        GROUP BY d.id HAVING COUNT(c.id) = 0
      )
    `).run();
    console.log(`  borrados: ${orphans.length}`);
  }
} catch (e) {
  console.warn(`  cleanup orphans failed: ${e.message}`);
}

console.log("\n[repair] VACUUM (reescribe el archivo, puede tardar):");
const t0 = Date.now();
try {
  db.exec("VACUUM;");
  console.log(`  done in ${Date.now() - t0}ms`);
} catch (e) {
  console.error(`  VACUUM failed: ${e.message}`);
  process.exit(1);
}

db.close();
console.log("\n[repair] OK. Iniciá el backend y volvé a clickear 'Cargar carpeta'.");
