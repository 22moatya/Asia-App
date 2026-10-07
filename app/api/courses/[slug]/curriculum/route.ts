import { NextResponse } from "next/server";
import { getPublicCourseCurriculum } from "@/lib/learning";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const curriculum = await getPublicCourseCurriculum(slug);
    if (!curriculum) {
      return NextResponse.json(
        { success: false, message: "Course not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Course curriculum retrieved successfully.",
      data: curriculum,
    });
  } catch (error) {
    console.error("Failed to retrieve public course curriculum.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve course curriculum." },
      { status: 503 }
    );
  }
}
