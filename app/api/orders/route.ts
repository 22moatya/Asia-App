import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";

export async function GET() {
  try {
    const authorization = await requireAuth();
    if (authorization.error) return authorization.error;
    await connectDB();
    const orders = await Order.find({ user: authorization.user.id })
      .select("items subtotal discount total currency status transactionId createdAt")
      .sort({ createdAt: -1, _id: -1 })
      .limit(50)
      .lean()
      .exec();
    return NextResponse.json({
      success: true,
      message: "Orders retrieved successfully.",
      data: orders.map((order) => ({
        ...order,
        _id: order._id.toString(),
        items: order.items.map((item) => ({
          ...item,
          course: item.course.toString(),
        })),
      })),
    });
  } catch (error) {
    console.error("Failed to retrieve orders for the current user.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve your orders." },
      { status: 503 }
    );
  }
}
