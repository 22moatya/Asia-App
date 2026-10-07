import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { lessonSchema } from "@/lib/learning-validations";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";
import { CourseLesson } from "@/models/CourseLesson";
import { CourseSection } from "@/models/CourseSection";

type RouteContext = {
  params: Promise<{ id: string; sectionId: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id, sectionId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(sectionId)) {
    return NextResponse.json(
      { success: false, message: "Invalid course or section ID." },
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
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Lesson details must be an object." },
        { status: 422 }
      );
    }
    const parsed = lessonSchema.safeParse({ ...body, sectionId });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Lesson details are invalid." },
        { status: 422 }
      );
    }
    await connectDB();
    const section = await CourseSection.findOne({
      _id: sectionId,
      course: id,
    })
      .select("_id")
      .lean()
      .exec();
    if (!section) {
      return NextResponse.json(
        { success: false, message: "Section not found in this course." },
        { status: 404 }
      );
    }
    const lesson = await CourseLesson.create({
      ...parsed.data,
      course: new mongoose.Types.ObjectId(id),
      section: section._id,
    });
    const lessonsCount = await CourseLesson.countDocuments({ course: id }).exec();
    await Course.updateOne({ _id: id }, { $set: { lessonsCount } }).exec();
    return NextResponse.json(
      {
        success: true,
        message: "Lesson created successfully.",
        data: { id: lesson._id.toString() },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create course lesson.", error);
    return NextResponse.json(
      { success: false, message: "Unable to create the lesson." },
      { status: 503 }
    );
  }
}
