import { NextResponse } from "next/server";
import {
  listPublishedCourses,
  parseCourseFilters,
} from "@/lib/course-catalog";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = parseCourseFilters(
    Object.fromEntries(url.searchParams.entries())
  );

  if (!parsed.success) {
    return NextResponse.json(
      {
        success: false,
        message: "Course filters are invalid.",
        errors: parsed.error.flatten().fieldErrors,
      },
      { status: 400 }
    );
  }

  try {
    const data = await listPublishedCourses(parsed.data);
    return NextResponse.json({
      success: true,
      message: "Courses retrieved successfully.",
      data,
    });
  } catch (error) {
    console.error("Failed to retrieve published courses.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve courses right now." },
      { status: 503 }
    );
  }
}
