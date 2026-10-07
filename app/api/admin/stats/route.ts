import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Course } from "@/models/Course";
import { Order } from "@/models/Order";
import { User } from "@/models/User";

export async function GET() {
  try {
    const authorization = await requireAdmin();
    if (authorization.error) return authorization.error;
    await connectDB();

    const [
      students,
      courses,
      publishedCourses,
      activeCategories,
      totalOrders,
      paidOrders,
      pendingPayments,
      revenueResult,
      latestCourses,
    ] = await Promise.all([
        User.countDocuments({ role: "student" }).exec(),
        Course.countDocuments().exec(),
        Course.countDocuments({ status: "published" }).exec(),
        Category.countDocuments({ isActive: true }).exec(),
        Order.countDocuments().exec(),
        Order.countDocuments({ status: "paid" }).exec(),
        Order.countDocuments({ status: "pending" }).exec(),
        Order.aggregate<{ revenue: number }>([
          { $match: { status: "paid" } },
          { $group: { _id: null, revenue: { $sum: "$total" } } },
        ]).exec(),
        Course.find()
          .select("title slug status createdAt")
          .sort({ createdAt: -1, _id: -1 })
          .limit(5)
          .lean()
          .exec(),
      ]);

    return NextResponse.json({
      success: true,
      message: "Dashboard statistics retrieved successfully.",
      data: {
        students,
        courses,
        publishedCourses,
        activeCategories,
        totalOrders,
        paidOrders,
        pendingPayments,
        revenue: revenueResult[0]?.revenue ?? 0,
        latestCourses: latestCourses.map((course) => ({
          title: course.title,
          slug: course.slug,
          status: course.status,
          createdAt: course.createdAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    console.error("Failed to retrieve admin dashboard statistics.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve dashboard statistics." },
      { status: 503 }
    );
  }
}
