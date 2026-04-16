import Database from "better-sqlite3";
const db = new Database("/home/guille/Documentos/trabajo/nueva/Mutualyf/backend/prisma/data/chat.db", { readonly: true });
console.log("integrity_check:");
for (const r of db.pragma("integrity_check")) console.log("  ", r);
console.log("\nquick_check:");
for (const r of db.pragma("quick_check")) console.log("  ", r);
console.log("\nTables in sqlite_master:");
for (const r of db.prepare("SELECT name, type FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY name").all()) {
  console.log(`  ${r.type}: ${r.name}`);
}
db.close();
