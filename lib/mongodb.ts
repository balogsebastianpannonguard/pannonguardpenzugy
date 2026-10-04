import { MongoClient } from "mongodb";

const globalForMongo = globalThis as unknown as { __penzugyMongo?: Promise<MongoClient> };

function getClient() {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Missing MONGODB_URI");
  if (!globalForMongo.__penzugyMongo) {
    globalForMongo.__penzugyMongo = new MongoClient(uri).connect();
  }
  return globalForMongo.__penzugyMongo;
}

export async function getMongoDb() {
  const client = await getClient();
  const dbName = process.env.MONGODB_DB;
  return dbName ? client.db(dbName) : client.db();
}
