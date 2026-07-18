// Local, on-device storage.
//
// On iOS/Android this uses @capacitor-community/sqlite with SQLCipher
// encryption turned on (see capacitor.config.json -> CapacitorSQLite).
// The encryption secret itself is a random value generated once per
// install and held in the device's secure storage (Keychain on iOS,
// Keystore-backed EncryptedSharedPreferences on Android) via
// capacitor-secure-storage-plugin - it is never hardcoded and never
// leaves the device.
//
// On plain web (npm run serve, used only for layout/dev preview) there
// is no native secure storage or SQLCipher available, so this falls
// back to a plain localStorage store. That fallback is NOT the secure
// path and must not be relied on for real participant data - always
// test the real behaviour on a device or simulator via Capacitor.

import { Capacitor } from "@capacitor/core";
import { CapacitorSQLite, SQLiteConnection } from "@capacitor-community/sqlite";
import { SecureStoragePlugin } from "capacitor-secure-storage-plugin";

const DB_NAME = "iam_prep";
const SECRET_KEY = "iam_db_secret_v1";
const ROW_ID = "current";

let sqlite = null;
let db = null;
let ready = null;

function randomSecret(){
  var bytes = new Uint8Array(32);
  window.crypto.getRandomValues(bytes);
  return Array.from(bytes).map(function(b){return b.toString(16).padStart(2,"0");}).join("");
}

async function getOrCreateSecret(){
  try{
    var existing = await SecureStoragePlugin.get({ key: SECRET_KEY });
    if (existing && existing.value) return existing.value;
  }catch(e){ /* not found yet - fall through and create one */ }
  var secret = randomSecret();
  await SecureStoragePlugin.set({ key: SECRET_KEY, value: secret });
  return secret;
}

async function initNative(){
  sqlite = new SQLiteConnection(CapacitorSQLite);
  var secret = await getOrCreateSecret();
  var isConsistent = await sqlite.checkConnectionsConsistency();
  var isConn = (await sqlite.isConnection(DB_NAME, false)).result;
  if (isConsistent.result && isConn){
    db = await sqlite.retrieveConnection(DB_NAME, false);
  } else {
    db = await sqlite.createConnection(DB_NAME, true, "secret", 1, false);
  }
  await db.open();
  // First open with a fresh encryption secret requires setting it once.
  try{
    var stored = await sqlite.isSecretStored();
    if (!stored.result) await sqlite.setEncryptionSecret(secret);
  }catch(e){ console.warn("encryption secret setup", e); }
  await db.execute(
    "CREATE TABLE IF NOT EXISTS assessment (" +
    "id TEXT PRIMARY KEY NOT NULL, " +
    "user_id TEXT, " +
    "data TEXT NOT NULL, " +
    "updated_at TEXT NOT NULL, " +
    "dirty INTEGER NOT NULL DEFAULT 0, " +
    "sync_mark TEXT, " +      // which account's data currently occupies this device
    "sync_lock INTEGER" +      // set on explicit logout - blocks the offline-login bypass
    ");"
  );
  // Older installs may already have the table without these two columns.
  try{ await db.execute("ALTER TABLE assessment ADD COLUMN sync_mark TEXT"); }catch(e){}
  try{ await db.execute("ALTER TABLE assessment ADD COLUMN sync_lock INTEGER"); }catch(e){}
}

async function initWeb(){
  // Dev-only fallback. See file header note above.
  db = {
    query: async function(sql, values){
      if (sql.indexOf("SELECT") === 0){
        var raw = localStorage.getItem("iam_web_dev_row");
        return { values: raw ? [JSON.parse(raw)] : [] };
      }
      return { values: [] };
    },
    run: async function(sql, values){
      if (sql.indexOf("INSERT") === 0 || sql.indexOf("UPDATE") === 0){
        var existingRaw = localStorage.getItem("iam_web_dev_row");
        var existing = existingRaw ? JSON.parse(existingRaw) : {};
        if (sql.indexOf("sync_mark") !== -1){
          existing.sync_mark = values[0];
        } else if (sql.indexOf("sync_lock") !== -1){
          existing.sync_lock = values[0];
        } else {
          existing = { id: ROW_ID, user_id: values[0], data: values[1], updated_at: values[2], dirty: values[3], sync_mark: existing.sync_mark, sync_lock: existing.sync_lock };
        }
        localStorage.setItem("iam_web_dev_row", JSON.stringify(existing));
      }
      return { changes: { changes: 1 } };
    }
  };
}

export function init(){
  if (!ready){
    ready = Capacitor.getPlatform() === "web" ? initWeb() : initNative();
  }
  return ready;
}

export async function loadRow(){
  await init();
  var res = await db.query("SELECT * FROM assessment WHERE id = ?", [ROW_ID]);
  return (res.values && res.values[0]) || null;
}

export async function saveRow(userId, dataObj, dirty){
  await init();
  var row = await loadRow();
  var payload = JSON.stringify(dataObj);
  var updatedAt = new Date().toISOString();
  if (row){
    await db.run(
      "UPDATE assessment SET user_id = ?, data = ?, updated_at = ?, dirty = ? WHERE id = ?",
      [userId || row.user_id || null, payload, updatedAt, dirty ? 1 : 0, ROW_ID]
    );
  } else {
    await db.run(
      "INSERT INTO assessment (id, user_id, data, updated_at, dirty) VALUES (?, ?, ?, ?, ?)",
      [ROW_ID, userId || null, payload, updatedAt, dirty ? 1 : 0]
    );
  }
  return updatedAt;
}

// Which account's data currently occupies this device (or null) - used
// to make sure a second person signing in on a shared device never
// gets the first person's answers merged into, or pushed from, their
// own account. Ported from the proven design's SYNCMARK.
export async function getSyncMark(){
  await init();
  var row = await loadRow();
  return (row && row.sync_mark) || null;
}
export async function setSyncMark(userId){
  await init();
  if (Capacitor.getPlatform() === "web"){
    var raw = localStorage.getItem("iam_web_dev_row");
    var existing = raw ? JSON.parse(raw) : {};
    existing.sync_mark = userId;
    localStorage.setItem("iam_web_dev_row", JSON.stringify(existing));
    return;
  }
  await db.run("UPDATE assessment SET sync_mark = ? WHERE id = ?", [userId, ROW_ID]);
}

// Set on explicit sign-out so the "keep working offline" bypass on the
// sign-in screen is disabled until the next real login. A session
// simply expiring (not a deliberate sign-out) does NOT set this.
export async function getSyncLock(){
  await init();
  var row = await loadRow();
  return !!(row && row.sync_lock);
}
export async function setSyncLock(locked){
  await init();
  if (Capacitor.getPlatform() === "web"){
    var raw = localStorage.getItem("iam_web_dev_row");
    var existing = raw ? JSON.parse(raw) : {};
    existing.sync_lock = locked ? 1 : 0;
    localStorage.setItem("iam_web_dev_row", JSON.stringify(existing));
    return;
  }
  await db.run("UPDATE assessment SET sync_lock = ? WHERE id = ?", [locked ? 1 : 0, ROW_ID]);
}

export async function clearRow(){
  await init();
  if (Capacitor.getPlatform() === "web"){
    localStorage.removeItem("iam_web_dev_row");
    return;
  }
  await db.run("DELETE FROM assessment WHERE id = ?", [ROW_ID]);
}
