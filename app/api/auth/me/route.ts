import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";

export async function GET() {
  try {
    const result = await requireAuth();
    if (result.error) {
      return result.error;
    }

    return NextResponse.json({
      success: true,
      message: "Authenticated user retrieved successfully.",
      data: result.user,
    });
  } catch (error) {
    console.error("Failed to retrieve the authenticated user.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve the current user." },
      { status: 500 }
    );
  }
}
