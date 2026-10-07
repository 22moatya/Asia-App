import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { lessonProgressSchema } from "@/lib/learning-validations";
import { connectDB } from "@/lib/mongodb";
import { CourseLesson } from "@/models/CourseLesson";
import { Enrollment } from "@/models/Enrollment";

type RouteContext = { params: Promise<{ courseId: string }> };

export async function GET(_request: Request, { params }: RouteContext) {
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
    await connectDB();
    const enrollment = await Enrollment.findOne({
      course: courseId,
      user: authorization.user.id,
      status: "active",
    })
      .lean()
      .exec();
    if (!enrollment) {
      return NextResponse.json(
        { success: false, message: "Active enrollment not found." },
        { status: 404 }
      );
    }
    const completedLessons = await CourseLesson.find({
      _id: { $in: enrollment.completedLessons },
      course: courseId,
    })
      .select("_id")
      .lean()
      .exec();
    const totalLessons = await CourseLesson.countDocuments({
      course: courseId,
    }).exec();
    const percentage =
      totalLessons === 0
        ? 0
        : Math.round((completedLessons.length / totalLessons) * 100);
    return NextResponse.json({
      success: true,
      message: "Learning progress retrieved successfully.",
      data: {
        courseId,
        totalLessons,
        completedLessonIds: completedLessons.map((lesson) =>
          lesson._id.toString()
        ),
        currentLessonId: enrollment.currentLesson?.toString() ?? null,
        progressPercentage: percentage,
      },
    });
  } catch (error) {
    console.error("Failed to retrieve enrollment progress.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve learning progress." },
      { status: 503 }
    );
  }
}

export async function PATCH(request: Request, { params }: RouteContext) {
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
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, message: "Request body must be valid JSON." },
        { status: 400 }
      );
    }
    const parsed = lessonProgressSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Progress update is invalid." },
        { status: 422 }
      );
    }
    await connectDB();
    const lesson = await CourseLesson.findOne({
      _id: parsed.data.lessonId,
      course: courseId,
    })
      .select("_id")
      .lean()
      .exec();
    if (!lesson) {
      return NextResponse.json(
        { success: false, message: "Lesson does not belong to this course." },
        { status: 404 }
      );
    }
    const enrollment = await Enrollment.findOneAndUpdate(
      {
        course: courseId,
        user: authorization.user.id,
        status: "active",
      },
      {
        ...(parsed.data.completed
          ? { $addToSet: { completedLessons: lesson._id } }
          : { $pull: { completedLessons: lesson._id } }),
        $set: {
          currentLesson: lesson._id,
          lastAccessedAt: new Date(),
        },
      },
      { returnDocument: "after" }
    )
      .lean()
      .exec();
    if (!enrollment) {
      return NextResponse.json(
        { success: false, message: "Active enrollment not found." },
        { status: 404 }
      );
    }
    const validCompletedCount = await CourseLesson.countDocuments({
      _id: { $in: enrollment.completedLessons },
      course: courseId,
    }).exec();
    const totalLessons = await CourseLesson.countDocuments({
      course: courseId,
    }).exec();
    const progressPercentage =
      totalLessons === 0
        ? 0
        : Math.round((validCompletedCount / totalLessons) * 100);
    await Enrollment.updateOne(
      { _id: enrollment._id, user: authorization.user.id, status: "active" },
      { $set: { progressPercentage } }
    ).exec();
    return NextResponse.json({
      success: true,
      message: "Learning progress updated successfully.",
      data: { progressPercentage },
    });
  } catch (error) {
    console.error("Failed to update enrollment progress.", error);
    return NextResponse.json(
      { success: false, message: "Unable to update learning progress." },
      { status: 503 }
    );
  }
}
