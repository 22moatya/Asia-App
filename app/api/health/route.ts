import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { connectDB } from "@/lib/mongodb";

export async function GET() {
  try {
    await connectDB();
    const database = mongoose.connection.db;
    if (!database) {
      throw new Error("MongoDB connection is not initialized.");
    }
    await database.admin().ping();

    return NextResponse.json({
      success: true,
      message: "Application and database are healthy.",
      data: { database: "connected" },
    });
  } catch (error) {
    console.error("Health check could not reach MongoDB.", error);
    return NextResponse.json(
      {
        success: false,
        message: "Database is unavailable.",
        data: { database: "disconnected" },
      },
      { status: 503 }
    );
  }
}
