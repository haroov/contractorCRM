const { MongoClient } = require("mongodb");

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB; // אופציונלי אם לא ב-URI
let client;

async function getDb() {
  if (!client) client = new MongoClient(uri);
  if (!client.topology) await client.connect();
  const db = client.db(dbName || undefined);
  return db;
}

module.exports = { getDb };
