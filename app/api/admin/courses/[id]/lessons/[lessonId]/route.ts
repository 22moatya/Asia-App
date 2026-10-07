import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { lessonSchema } from "@/lib/learning-validations";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";
import { CourseLesson } from "@/models/CourseLesson";
import { CourseSection } from "@/models/CourseSection";
import { Enrollment } from "@/models/Enrollment";

type RouteContext = {
  params: Promise<{ id: string; lessonId: string }>;
};

export async function PUT(request: Request, { params }: RouteContext) {
  const { id, lessonId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(lessonId)) {
    return NextResponse.json(
      { success: false, message: "Invalid course or lesson ID." },
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
    const parsed = lessonSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Lesson details are invalid." },
        { status: 422 }
      );
    }
    await connectDB();
    const section = await CourseSection.findOne({
      _id: parsed.data.sectionId,
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
    const lesson = await CourseLesson.findOneAndUpdate(
      { _id: lessonId, course: id },
      { ...parsed.data, section: section._id },
      { returnDocument: "after", runValidators: true }
    )
      .select("_id")
      .lean()
      .exec();
    if (!lesson) {
      return NextResponse.json(
        { success: false, message: "Lesson not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Lesson updated successfully.",
      data: { id: lesson._id.toString() },
    });
  } catch (error) {
    console.error("Failed to update course lesson.", error);
    return NextResponse.json(
      { success: false, message: "Unable to update this lesson." },
      { status: 503 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
  const { id, lessonId } = await params;
  if (!mongoose.isValidObjectId(id) || !mongoose.isValidObjectId(lessonId)) {
    return NextResponse.json(
      { success: false, message: "Invalid course or lesson ID." },
      { status: 400 }
    );
  }
  try {
    const authorization = await requireAdmin();
    if (authorization.error) return authorization.error;
    await connectDB();
    const lesson = await CourseLesson.findOneAndDelete({
      _id: lessonId,
      course: id,
    })
      .select("_id")
      .lean()
      .exec();
    if (!lesson) {
      return NextResponse.json(
        { success: false, message: "Lesson not found." },
        { status: 404 }
      );
    }
    await Promise.all([
      Enrollment.updateMany(
        { course: id },
        { $pull: { completedLessons: lesson._id } }
      ).exec(),
      Enrollment.updateMany(
        { course: id, currentLesson: lesson._id },
        { $set: { currentLesson: null } }
      ).exec(),
      CourseLesson.countDocuments({ course: id })
        .then((lessonsCount) =>
          Course.updateOne({ _id: id }, { $set: { lessonsCount } }).exec()
        ),
    ]);
    return NextResponse.json({
      success: true,
      message: "Lesson deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete course lesson.", error);
    return NextResponse.json(
      { success: false, message: "Unable to delete this lesson." },
      { status: 503 }
    );
  }
}
