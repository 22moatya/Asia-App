import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";

export async function GET() {
  try {
    const result = await requireAdmin();
    if (result.error) {
      return result.error;
    }

    return NextResponse.json({
      success: true,
      message: "Administrator account retrieved successfully.",
      data: result.user,
    });
  } catch (error) {
    console.error("Failed to retrieve the administrator account.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve the administrator account." },
      { status: 500 }
    );
  }
}
