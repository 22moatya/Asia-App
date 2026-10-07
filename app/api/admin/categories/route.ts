import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { adminCategorySchema } from "@/lib/admin-validations";
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

export async function GET() {
  try {
    const authorization = await requireAdmin();
    if (authorization.error) return authorization.error;
    await connectDB();
    const categories = await Category.find()
      .sort({ order: 1, name: 1 })
      .lean()
      .exec();
    const counts = await Course.aggregate<{
      _id: { toString(): string };
      count: number;
    }>([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]).exec();
    const countByCategory = new Map(
      counts.map((entry) => [entry._id.toString(), entry.count])
    );

    return NextResponse.json({
      success: true,
      message: "Categories retrieved successfully.",
      data: categories.map((category) => ({
        ...category,
        _id: category._id.toString(),
        courseCount: countByCategory.get(category._id.toString()) ?? 0,
      })),
    });
  } catch (error) {
    console.error("Failed to retrieve admin categories.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve categories right now." },
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
    const category = await Category.create(parsed.data);
    return NextResponse.json(
      {
        success: true,
        message: "Category created successfully.",
        data: { id: category._id.toString(), slug: category.slug },
      },
      { status: 201 }
    );
  } catch (error) {
    if (duplicateSlug(error)) {
      return NextResponse.json(
        { success: false, message: "A category with this slug already exists." },
        { status: 409 }
      );
    }
    console.error("Failed to create admin category.", error);
    return NextResponse.json(
      { success: false, message: "Unable to create this category right now." },
      { status: 503 }
    );
  }
}
