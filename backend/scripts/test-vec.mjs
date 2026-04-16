import Database from "better-sqlite3";
import * as sqliteVec from "sqlite-vec";
import * as fs from "fs";

const TEST_DB = "/tmp/vec-test.db";
for (const ext of ["", "-wal", "-shm"]) { try { fs.unlinkSync(TEST_DB + ext); } catch {} }

const db = new Database(TEST_DB);
db.pragma("journal_mode = WAL");

console.log("sqlite_version:", db.prepare("SELECT sqlite_version() as v").get().v);

sqliteVec.load(db);
console.log("vec_version:", db.prepare("SELECT vec_version() as v").get().v);

console.log("\nCreating vec0 table...");
db.exec(`CREATE VIRTUAL TABLE kb_test USING vec0(chunk_id INTEGER PRIMARY KEY, embedding FLOAT[768]);`);
console.log("  OK");

console.log("\nIntegrity check after CREATE:");
for (const r of db.pragma("integrity_check")) console.log("  ", r);

console.log("\nInserting 5 vectors...");
const ins = db.prepare("INSERT INTO kb_test(chunk_id, embedding) VALUES (?, ?)");
for (let i = 1; i <= 5; i++) {
  const v = new Float32Array(768).fill(Math.random());
  ins.run(BigInt(i), Buffer.from(v.buffer));
}
console.log("  OK");

console.log("\nIntegrity check after 5 inserts:");
for (const r of db.pragma("integrity_check")) console.log("  ", r);

console.log("\nKNN search:");
const rows = db.prepare("SELECT chunk_id, distance FROM kb_test WHERE embedding MATCH ? AND k = 3 ORDER BY distance").all(
  Buffer.from(new Float32Array(768).fill(0.5).buffer)
);
console.log("  rows:", rows);

db.close();
console.log("\nSUCCESS");
