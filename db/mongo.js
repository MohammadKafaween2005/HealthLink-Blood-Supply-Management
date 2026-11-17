import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

const client = new MongoClient(process.env.MONGO_URL);

let db;

export async function connectMongo() {
    await client.connect();
    db = client.db(process.env.MONGO_DB);

    console.log("MongoDB connected");
}

export function getMongoDB() {
    return db;
}