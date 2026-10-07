import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { adminCourseSchema } from "@/lib/admin-validations";
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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const course = await Course.findById(id).lean().exec();
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course retrieved successfully.",
      data: {
        ...course,
        _id: course._id.toString(),
        category: course.category.toString(),
      },
    });
  } catch (error) {
    console.error("Failed to retrieve admin course.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve this course right now." },
      { status: 503 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const course = await Course.findByIdAndUpdate(
      id,
      { ...parsed.data, category: category._id },
      { returnDocument: "after", runValidators: true }
    )
      .select("_id slug")
      .lean()
      .exec();
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course updated successfully.",
      data: { id: course._id.toString(), slug: course.slug },
    });
  } catch (error) {
    if (duplicateSlug(error)) {
      return NextResponse.json(
        { success: false, message: "A course with this slug already exists." },
        { status: 409 }
      );
    }
    console.error("Failed to update admin course.", error);
    return NextResponse.json(
      { success: false, message: "Unable to update this course right now." },
      { status: 503 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const course = await Course.findByIdAndUpdate(
      id,
      { status: "archived" },
      { returnDocument: "after" }
    )
      .select("_id")
      .lean()
      .exec();
    if (!course) {
      return NextResponse.json(
        { success: false, message: "Course not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Course archived successfully.",
    });
  } catch (error) {
    console.error("Failed to archive admin course.", error);
    return NextResponse.json(
      { success: false, message: "Unable to archive this course right now." },
      { status: 503 }
    );
  }
}
