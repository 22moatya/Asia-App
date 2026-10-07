import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/api-auth";
import { getLessonForStudent } from "@/lib/learning";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string; lessonId: string }> }
) {
  const { slug, lessonId } = await params;
  try {
    const user = await getCurrentUser();
    const result = await getLessonForStudent(slug, lessonId, user?.id);
    if (result.kind === "not-found") {
      return NextResponse.json(
        { success: false, message: "Lesson not found." },
        { status: 404 }
      );
    }
    if (result.kind === "forbidden") {
      return NextResponse.json(
        { success: false, message: "Enrollment is required to access this lesson." },
        { status: 403 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Lesson retrieved successfully.",
      data: result,
    });
  } catch (error) {
    console.error("Failed to retrieve course lesson.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve this lesson." },
      { status: 503 }
    );
  }
}
