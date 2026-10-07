import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const { orderId } = await params;
  if (!mongoose.isValidObjectId(orderId)) {
    return NextResponse.json(
      { success: false, message: "Invalid order ID." },
      { status: 400 }
    );
  }
  try {
    const authorization = await requireAuth();
    if (authorization.error) return authorization.error;
    await connectDB();
    const order = await Order.findOne({
      _id: orderId,
      user: authorization.user.id,
    })
      .select("items subtotal discount total currency status transactionId createdAt")
      .lean()
      .exec();
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Order retrieved successfully.",
      data: {
        ...order,
        _id: order._id.toString(),
        items: order.items.map((item) => ({
          ...item,
          course: item.course.toString(),
        })),
      },
    });
  } catch (error) {
    console.error("Failed to retrieve a current-user order.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve this order." },
      { status: 503 }
    );
  }
}
