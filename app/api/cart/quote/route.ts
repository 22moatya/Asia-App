import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";

function validCourseIds(value: unknown): value is string[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    value.length <= 20 &&
    value.every(
      (id) => typeof id === "string" && mongoose.isValidObjectId(id)
    ) &&
    new Set(value).size === value.length
  );
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
      typeof body !== "object" ||
      body === null ||
      Array.isArray(body) ||
      !("courseIds" in body) ||
      !validCourseIds(body.courseIds)
    ) {
      return NextResponse.json(
        { success: false, message: "Choose between 1 and 20 unique courses." },
        { status: 422 }
      );
    }
    await connectDB();
    const [courses, enrollments, categories] = await Promise.all([
      Course.find({
        _id: { $in: body.courseIds },
        status: "published",
        price: { $gt: 0 },
      })
        .select("title slug thumbnail price category")
        .lean()
        .exec(),
      Enrollment.find({
        user: authorization.user.id,
        course: { $in: body.courseIds },
        status: "active",
      })
        .select("course")
        .lean()
        .exec(),
      Category.find({ isActive: true }).select("_id").lean().exec(),
    ]);
    const activeCategoryIds = new Set(
      categories.map((category) => category._id.toString())
    );
    const enrolledCourseIds = new Set(
      enrollments.map((enrollment) => enrollment.course.toString())
    );
    const availableCourses = courses.filter(
      (course) =>
        activeCategoryIds.has(course.category.toString()) &&
        !enrolledCourseIds.has(course._id.toString())
    );
    if (availableCourses.length !== body.courseIds.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more courses are unavailable, free, or already in your library. Refresh your cart and try again.",
        },
        { status: 422 }
      );
    }
    const items = availableCourses.map((course) => ({
      id: course._id.toString(),
      title: course.title,
      slug: course.slug,
      thumbnail: course.thumbnail,
      price: course.price,
    }));
    const total = Math.round(
      items.reduce((sum, item) => sum + item.price, 0) * 100
    ) / 100;
    return NextResponse.json({
      success: true,
      message: "Cart prices calculated from the current catalog.",
      data: { items, total, currency: "EGP" },
    });
  } catch (error) {
    console.error("Failed to quote the current user's cart.", error);
    return NextResponse.json(
      { success: false, message: "Unable to calculate your cart total." },
      { status: 503 }
    );
  }
}
