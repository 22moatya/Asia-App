import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { adminStudentStatusSchema } from "@/lib/admin-validations";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) {
    return NextResponse.json(
      { success: false, message: "Invalid student ID." },
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

    const parsed = adminStudentStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Student status is invalid." },
        { status: 422 }
      );
    }
    await connectDB();
    const student = await User.findOneAndUpdate(
      { _id: id, role: "student" },
      { isActive: parsed.data.isActive },
      { returnDocument: "after" }
    )
      .select("_id isActive")
      .lean()
      .exec();
    if (!student) {
      return NextResponse.json(
        { success: false, message: "Student not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Student status updated successfully.",
      data: { id: student._id.toString(), isActive: student.isActive },
    });
  } catch (error) {
    console.error("Failed to update student status.", error);
    return NextResponse.json(
      { success: false, message: "Unable to update this student right now." },
      { status: 503 }
    );
  }
}
