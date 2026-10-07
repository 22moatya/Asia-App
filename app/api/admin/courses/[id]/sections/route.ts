import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { sectionSchema } from "@/lib/learning-validations";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";
import { CourseLesson } from "@/models/CourseLesson";
import { CourseSection } from "@/models/CourseSection";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid course ID." },
      { status: 400 }
    );
  }
  try {
    const authorization = await requireAdmin();
    if (authorization.error) return authorization.error;
    await connectDB();
    if (!(await Course.exists({ _id: id }))) {
      return NextResponse.json(
        { success: false, message: "Course not found." },
        { status: 404 }
      );
    }
    const [sections, lessons] = await Promise.all([
      CourseSection.find({ course: id }).sort({ order: 1, _id: 1 }).lean().exec(),
      CourseLesson.find({ course: id })
        .sort({ section: 1, order: 1, _id: 1 })
        .lean()
        .exec(),
    ]);
    return NextResponse.json({
      success: true,
      message: "Course curriculum retrieved successfully.",
      data: {
        sections: sections.map((section) => ({
          ...section,
          _id: section._id.toString(),
          course: section.course.toString(),
        })),
        lessons: lessons.map((lesson) => ({
          ...lesson,
          _id: lesson._id.toString(),
          course: lesson.course.toString(),
          section: lesson.section.toString(),
        })),
      },
    });
  } catch (error) {
    console.error("Failed to retrieve course curriculum for administration.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve the course curriculum." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid course ID." },
      { status: 400 }
    );
  }
  try {
    const authorization = await requireAdmin();
    if (authorization.error) return authorization.error;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }
    const parsed = sectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Section details are invalid." },
        { status: 422 }
      );
    }
    await connectDB();
    if (!(await Course.exists({ _id: id }))) {
      return NextResponse.json(
        { success: false, message: "Course not found." },
        { status: 404 }
      );
    }
    const section = await CourseSection.create({
      ...parsed.data,
      course: new mongoose.Types.ObjectId(id),
    });
    return NextResponse.json(
      {
        success: true,
        message: "Section created successfully.",
        data: { id: section._id.toString() },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create course section.", error);
    return NextResponse.json(
      { success: false, message: "Unable to create the course section." },
      { status: 503 }
    );
  }
}
