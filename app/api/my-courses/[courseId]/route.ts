import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { getEnrolledCourse } from "@/lib/learning";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> }
) {
  const { courseId } = await params;
  if (!mongoose.isValidObjectId(courseId)) {
    return NextResponse.json(
      { success: false, message: "Invalid course ID." },
      { status: 400 }
    );
  }
  try {
    const authorization = await requireAuth();
    if (authorization.error) return authorization.error;
    const course = await getEnrolledCourse(
      courseId,
      authorization.user.id,
      true
    );
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Active enrollment not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Enrolled course retrieved successfully.",
      data: course,
    });
  } catch (error) {
    console.error("Failed to retrieve enrolled course.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve this course." },
      { status: 503 }
    );
  }
}
