import { NextResponse } from "next/server";
import { getPublishedCourseBySlug } from "@/lib/course-catalog";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  try {
    const course = await getPublishedCourseBySlug(slug);
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course retrieved successfully.",
      data: course,
    });
  } catch (error) {
    console.error("Failed to retrieve published course.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve this course right now." },
      { status: 503 }
    );
  }
}
