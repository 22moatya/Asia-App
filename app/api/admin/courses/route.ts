import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  adminCourseSchema,
  adminCourseListQuerySchema,
} from "@/lib/admin-validations";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Course } from "@/models/Course";

function duplicateSlug(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === 11000
  );
}

export async function GET(request: Request) {
  try {
    const authorization = await requireAdmin();
    if (authorization.error) return authorization.error;

    const url = new URL(request.url);
    const parsed = adminCourseListQuerySchema.safeParse({
      q: url.searchParams.get("q") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid course list filters." },
        { status: 400 }
      );
    }

    await connectDB();
    const filter: Record<string, unknown> = {};
    if (parsed.data.status) {
      filter.status = parsed.data.status;
    }
    if (parsed.data.q) {
      const escaped = parsed.data.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { title: new RegExp(escaped, "i") },
        { instructor: new RegExp(escaped, "i") },
        { slug: new RegExp(escaped, "i") },
      ];
    }
    const total = await Course.countDocuments(filter).exec();
    const totalPages = Math.ceil(total / parsed.data.limit);
    const courses =
      parsed.data.page <= totalPages
        ? await Course.find(filter)
        .select("title slug category instructor price status studentsCount createdAt")
        .populate("category", "name")
        .sort({ createdAt: -1, _id: -1 })
        .skip((parsed.data.page - 1) * parsed.data.limit)
        .limit(parsed.data.limit)
        .lean()
        .exec()
        : [];

    return NextResponse.json({
      success: true,
      message: "Courses retrieved successfully.",
      data: {
        courses: courses.map((course) => ({
          ...course,
          _id: course._id.toString(),
          category:
            course.category && typeof course.category === "object"
              ? {
                  ...course.category,
                  _id: course.category._id.toString(),
                }
              : null,
        })),
        pagination: {
          page: parsed.data.page,
          limit: parsed.data.limit,
          total,
          totalPages,
        },
      },
    });
  } catch (error) {
    console.error("Failed to retrieve admin courses.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve courses right now." },
      { status: 503 }
    );
  }
}

export async function POST(request: Request) {
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
    const parsed = adminCourseSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Course details are invalid.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    await connectDB();
    const category = await Category.findOne({
      _id: new mongoose.Types.ObjectId(parsed.data.category),
      isActive: true,
    })
      .select("_id")
      .lean()
      .exec();
    if (!category) {
      return NextResponse.json(
        { success: false, message: "Choose an active course category." },
        { status: 422 }
      );
    }

    const course = await Course.create({
      ...parsed.data,
      category: category._id,
    });
    return NextResponse.json(
      {
        success: true,
        message: "Course created successfully.",
        data: { id: course._id.toString(), slug: course.slug },
      },
      { status: 201 }
    );
  } catch (error) {
    if (duplicateSlug(error)) {
      return NextResponse.json(
        { success: false, message: "A course with this slug already exists." },
        { status: 409 }
      );
    }
    console.error("Failed to create admin course.", error);
    return NextResponse.json(
      { success: false, message: "Unable to create this course right now." },
      { status: 503 }
    );
  }
}
