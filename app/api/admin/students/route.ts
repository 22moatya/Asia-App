import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { adminStudentListQuerySchema } from "@/lib/admin-validations";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

export async function GET(request: Request) {
  try {
    const authorization = await requireAdmin();
    if (authorization.error) return authorization.error;

    const url = new URL(request.url);
    const parsed = adminStudentListQuerySchema.safeParse({
      q: url.searchParams.get("q") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      isActive: url.searchParams.get("isActive") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid student list filters." },
        { status: 400 }
      );
    }

    await connectDB();
    const filter: Record<string, unknown> = { role: "student" };
    if (parsed.data.isActive !== undefined) {
      filter.isActive = parsed.data.isActive;
    }
    if (parsed.data.q) {
      const escaped = parsed.data.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { name: new RegExp(escaped, "i") },
        { email: new RegExp(escaped, "i") },
      ];
    }
    const total = await User.countDocuments(filter).exec();
    const totalPages = Math.ceil(total / parsed.data.limit);
    const students =
      parsed.data.page <= totalPages
        ? await User.find(filter)
        .select("name email isActive createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .skip((parsed.data.page - 1) * parsed.data.limit)
        .limit(parsed.data.limit)
        .lean()
        .exec()
        : [];

    return NextResponse.json({
      success: true,
      message: "Students retrieved successfully.",
      data: {
        students: students.map((student) => ({
          id: student._id.toString(),
          name: student.name,
          email: student.email,
          isActive: student.isActive,
          joinedAt: student.createdAt.toISOString(),
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
    console.error("Failed to retrieve admin students.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve students right now." },
      { status: 503 }
    );
  }
}
