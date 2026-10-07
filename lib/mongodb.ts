import mongoose from "mongoose";

type MongooseCache = {
  connection: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  var mongooseCache: MongooseCache | undefined;
}

const cache =
  globalThis.mongooseCache ??
  (globalThis.mongooseCache = { connection: null, promise: null });

export async function connectDB(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new Error("MONGODB_URI is required to connect to MongoDB.");
  }

  if (cache.connection && mongoose.connection.readyState === 1) {
    return cache.connection;
  }

  if (!cache.promise) {
    cache.promise = mongoose
      .connect(uri, { serverSelectionTimeoutMS: 10_000 })
      .then(() => mongoose)
      .catch((error: unknown) => {
        cache.promise = null;
        cache.connection = null;
        throw error;
      });
  }

  cache.connection = await cache.promise;
  return cache.connection;
}
