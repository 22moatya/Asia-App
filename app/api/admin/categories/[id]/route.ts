import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import {
  adminCategoryPatchSchema,
  adminCategorySchema,
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

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid category ID." },
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
    const parsed = adminCategorySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Category details are invalid.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    await connectDB();
    const category = await Category.findByIdAndUpdate(
      id,
      parsed.data,
      { returnDocument: "after", runValidators: true }
    )
      .select("_id slug")
      .lean()
      .exec();
    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category updated successfully.",
      data: { id: category._id.toString(), slug: category.slug },
    });
  } catch (error) {
    if (duplicateSlug(error)) {
      return NextResponse.json(
        { success: false, message: "A category with this slug already exists." },
        { status: 409 }
      );
    }
    console.error("Failed to update admin category.", error);
    return NextResponse.json(
      { success: false, message: "Unable to update this category right now." },
      { status: 503 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid category ID." },
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
    const parsed = adminCategoryPatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          message: "Category updates are invalid.",
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 422 }
      );
    }

    await connectDB();
    const category = await Category.findByIdAndUpdate(
      id,
      parsed.data,
      { returnDocument: "after", runValidators: true }
    )
      .select("_id slug isActive")
      .lean()
      .exec();
    if (!category) {
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Category updated successfully.",
      data: {
        id: category._id.toString(),
        slug: category.slug,
        isActive: category.isActive,
      },
    });
  } catch (error) {
    if (duplicateSlug(error)) {
      return NextResponse.json(
        { success: false, message: "A category with this slug already exists." },
        { status: 409 }
      );
    }
    console.error("Failed to update admin category.", error);
    return NextResponse.json(
      { success: false, message: "Unable to update this category right now." },
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
      { success: false, message: "Invalid category ID." },
      { status: 400 }
    );
  }

  try {
    const authorization = await requireAdmin();
    if (authorization.error) return authorization.error;
    await connectDB();

    const existing = await Category.findById(id).select("_id").lean().exec();
    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Category not found." },
        { status: 404 }
      );
    }
    const courses = await Course.countDocuments({ category: existing._id });
    if (courses > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "Reassign all courses to another category before deleting it.",
        },
        { status: 409 }
      );
    }
    await Category.deleteOne({ _id: existing._id }).exec();
    return NextResponse.json({
      success: true,
      message: "Category deleted successfully.",
    });
  } catch (error) {
    console.error("Failed to delete admin category.", error);
    return NextResponse.json(
      { success: false, message: "Unable to delete this category right now." },
      { status: 503 }
    );
  }
}
