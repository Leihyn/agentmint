import fs from "fs";
import path from "path";
import { DbSchema, createEmptyDb } from "./schema";

const DB_PATH = path.join(__dirname, "..", "..", "agentmint.json");

let db: DbSchema | null = null;

function load(): DbSchema {
  if (db) return db;

  if (fs.existsSync(DB_PATH)) {
    try {
      db = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
      return db!;
    } catch {
      // Corrupted file — start fresh
    }
  }

  db = createEmptyDb();
  save();
  return db;
}

function save() {
  if (!db) return;
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

export function getDb(): DbSchema {
  return load();
}

export function saveDb() {
  save();
}

export function nextId(table: keyof DbSchema["_nextId"]): number {
  const data = load();
  const id = data._nextId[table];
  data._nextId[table] = id + 1;
  save();
  return id;
}
