import { loadEnvConfig } from "@next/env";
import mongoose from "mongoose";
import { connectDB } from "../lib/mongodb";

loadEnvConfig(process.cwd());

async function main() {
  try {
    await connectDB();
    const database = mongoose.connection.db;
    if (!database) {
      throw new Error("MongoDB connection is not initialized.");
    }
    await database.admin().ping();
    console.log("MongoDB connection verified.");
  } finally {
    await mongoose.disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("MongoDB connection check failed.", error);
  process.exitCode = 1;
});
