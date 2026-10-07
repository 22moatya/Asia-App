import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { sectionUpdateSchema } from "@/lib/learning-validations";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";
import { CourseLesson } from "@/models/CourseLesson";
import { CourseSection } from "@/models/CourseSection";
import { Enrollment } from "@/models/Enrollment";

type RouteContext = {
  params: Promise<{ id: string; sectionId: string }>;
};

export async function PATCH(request: Request, { params }: RouteContext) {
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
    const parsed = sectionUpdateSchema.safeParse(body);
    if (!parsed.success || Object.keys(parsed.data ?? {}).length === 0) {
      return NextResponse.json(
        { success: false, message: "Section updates are invalid." },
        { status: 422 }
      );
    }
    await connectDB();
    const section = await CourseSection.findOneAndUpdate(
      { _id: sectionId, course: id },
      parsed.data,
      { returnDocument: "after", runValidators: true }
    )
      .select("_id")
      .lean()
      .exec();
    if (!section) {
      return NextResponse.json(
        { success: false, message: "Section not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Section updated successfully.",
      data: { id: section._id.toString() },
    });
  } catch (error) {
    console.error("Failed to update course section.", error);
    return NextResponse.json(
      { success: false, message: "Unable to update this section." },
      { status: 503 }
    );
  }
}

export async function DELETE(_request: Request, { params }: RouteContext) {
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
        { success: false, message: "Section not found." },
        { status: 404 }
      );
    }
    const lessons = await CourseLesson.find({
      course: id,
      section: section._id,
    })
      .select("_id")
      .lean()
      .exec();
    const lessonIds = lessons.map((lesson) => lesson._id);
    await Promise.all([
      CourseSection.deleteOne({ _id: section._id, course: id }).exec(),
      CourseLesson.deleteMany({ course: id, section: section._id }).exec(),
      Enrollment.updateMany(
        { course: id },
        { $pull: { completedLessons: { $in: lessonIds } } }
      ).exec(),
      Enrollment.updateMany(
        { course: id, currentLesson: { $in: lessonIds } },
        { $set: { currentLesson: null } }
      ).exec(),
    ]);
    const lessonsCount = await CourseLesson.countDocuments({ course: id }).exec();
    await Course.updateOne({ _id: id }, { $set: { lessonsCount } }).exec();
    return NextResponse.json({
      success: true,
      message: "Section and its lessons deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete course section.", error);
    return NextResponse.json(
      { success: false, message: "Unable to delete this section." },
      { status: 503 }
    );
  }
}
