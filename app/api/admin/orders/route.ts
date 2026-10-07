import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-auth";
import { adminOrderListQuerySchema } from "@/lib/admin-validations";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";

export async function GET(request: Request) {
  try {
    const authorization = await requireAdmin();
    if (authorization.error) return authorization.error;

    const url = new URL(request.url);
    const parsed = adminOrderListQuerySchema.safeParse({
      q: url.searchParams.get("q") ?? undefined,
      page: url.searchParams.get("page") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      status: url.searchParams.get("status") ?? undefined,
    });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, message: "Invalid order list filters." },
        { status: 400 }
      );
    }

    await connectDB();
    const filter: Record<string, unknown> = {};
    if (parsed.data.status) filter.status = parsed.data.status;
    if (parsed.data.q) {
      const escaped = parsed.data.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const alternatives: Record<string, unknown>[] = [
        { customerName: new RegExp(escaped, "i") },
        { customerEmail: new RegExp(escaped, "i") },
        { transactionId: new RegExp(escaped, "i") },
        { "items.title": new RegExp(escaped, "i") },
      ];
      if (mongoose.isValidObjectId(parsed.data.q)) {
        alternatives.push({ _id: new mongoose.Types.ObjectId(parsed.data.q) });
      }
      filter.$or = alternatives;
    }

    const total = await Order.countDocuments(filter).exec();
    const totalPages = Math.ceil(total / parsed.data.limit);
    const orders =
      parsed.data.page <= totalPages
        ? await Order.find(filter)
            .select(
              "user items subtotal discount total currency status provider transactionId customerName customerEmail createdAt"
            )
            .populate("user", "name email")
            .sort({ createdAt: -1, _id: -1 })
            .skip((parsed.data.page - 1) * parsed.data.limit)
            .limit(parsed.data.limit)
            .lean()
            .exec()
        : [];

    return NextResponse.json({
      success: true,
      message: "Orders retrieved successfully.",
      data: {
        orders: orders.map((order) => ({
          ...order,
          _id: order._id.toString(),
          user:
            order.user && typeof order.user === "object"
              ? {
                  ...order.user,
                  _id: order.user._id.toString(),
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
    console.error("Failed to retrieve admin orders.", error);
    return NextResponse.json(
      { success: false, message: "Unable to retrieve orders right now." },
      { status: 503 }
    );
  }
}
