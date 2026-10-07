import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";

export async function GET() {
  try {
    const authorization = await requireAuth();
    if (authorization.error) return authorization.error;
    await connectDB();
    const enrollments = await Enrollment.find({
      user: authorization.user.id,
    })
      .sort({ enrolledAt: -1 })
      .limit(100)
      .lean()
      .exec();
    return NextResponse.json({
      success: true,
      message: "Enrollments retrieved successfully.",
      data: enrollments.map((enrollment) => ({
        ...enrollment,
        _id: enrollment._id.toString(),
        user: enrollment.user.toString(),
        course: enrollment.course.toString(),
        order: enrollment.order?.toString() ?? null,
        currentLesson: enrollment.currentLesson?.toString() ?? null,
        completedLessons: enrollment.completedLessons.map((id) =>
          id.toString()
        ),
      })),
    });
  } catch (error) {
    console.error("Failed to retrieve current user enrollments.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve enrollments." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
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
    if (
      !body ||
      typeof body !== "object" ||
      Array.isArray(body) ||
      !("courseId" in body) ||
      typeof body.courseId !== "string" ||
      !mongoose.isValidObjectId(body.courseId)
    ) {
      return NextResponse.json(
        { success: false, message: "A valid courseId is required." },
        { status: 422 }
      );
    }
    await connectDB();
    const course = await Course.findOne({
      _id: body.courseId,
      status: "published",
      price: 0,
    })
      .select("_id category")
      .lean()
      .exec();
    if (!course) {
      return NextResponse.json(
        {
          success: false,
          message:
            "Only published free courses can be joined directly. Paid courses require verified payment.",
        },
        { status: 403 }
      );
    }
    const category = await Category.exists({
      _id: course.category,
      isActive: true,
    });
    if (!category) {
      return NextResponse.json(
        { success: false, message: "This course is unavailable." },
        { status: 404 }
      );
    }

    let enrollment;
    try {
      enrollment = await Enrollment.findOneAndUpdate(
        { user: authorization.user.id, course: course._id },
        {
          $setOnInsert: {
            user: authorization.user.id,
            course: course._id,
            status: "active",
            enrolledAt: new Date(),
          },
        },
        { upsert: true, returnDocument: "after", runValidators: true }
      )
        .lean()
        .exec();
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== 11000
      ) {
        throw error;
      }
      enrollment = await Enrollment.findOne({
        user: authorization.user.id,
        course: course._id,
      })
        .lean()
        .exec();
    }
    if (!enrollment) {
      throw new Error("Enrollment upsert did not return a document.");
    }
    if (enrollment.status !== "active") {
      return NextResponse.json(
        { success: false, message: "This enrollment is not active." },
        { status: 409 }
      );
    }
    return NextResponse.json(
      {
        success: true,
        message: "You are enrolled in this free course.",
        data: { id: enrollment._id.toString(), courseId: course._id.toString() },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to enroll current user in a free course.", error);
    return NextResponse.json(
      { success: false, message: "Unable to enroll in this course." },
      { status: 503 }
    );
  }
}
