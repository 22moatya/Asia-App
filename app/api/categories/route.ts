import { NextResponse } from "next/server";
import { getCategoryCounts } from "@/lib/course-catalog";

export async function GET() {
  try {
    const data = await getCategoryCounts();
    return NextResponse.json({
      success: true,
      message: "Categories retrieved successfully.",
      data,
    });
  } catch (error) {
    console.error("Failed to retrieve active course categories.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve categories right now." },
      { status: 503 }
    );
  }
}
