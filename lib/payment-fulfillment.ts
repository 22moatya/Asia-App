import mongoose from "mongoose";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { Order } from "@/models/Order";

export type VerifiedPayment = {
  amount: number;
  currency: string;
  merchantOrderId: string;
  transactionId: string;
};

export async function fulfillVerifiedOrder(
  orderId: string,
  payment: VerifiedPayment
) {
  if (!mongoose.isValidObjectId(orderId)) {
    return { kind: "not-found" as const };
  }
  await connectDB();
  const order = await Order.findById(orderId).lean().exec();
  if (!order) return { kind: "not-found" as const };
  if (
    order.merchantOrderId !== payment.merchantOrderId ||
    order.currency !== payment.currency ||
    Math.round(order.total * 100) !== Math.round(payment.amount * 100) ||
    !payment.transactionId
  ) {
    return { kind: "mismatch" as const };
  }
  if (order.status === "paid") return { kind: "already-paid" as const };
  if (order.status !== "pending") return { kind: "not-pending" as const };

  for (const item of order.items) {
    const courseExists = await Course.exists({ _id: item.course });
    if (!courseExists) {
      return { kind: "course-unavailable" as const };
    }
    try {
      const enrollment = await Enrollment.updateOne(
        { user: order.user, course: item.course },
        {
          $set: { status: "active", order: order._id },
          $setOnInsert: {
            user: order.user,
            course: item.course,
            enrolledAt: new Date(),
          },
        },
        { upsert: true, runValidators: true }
      ).exec();
      if (enrollment.upsertedCount) {
        await Course.updateOne(
          { _id: item.course },
          { $inc: { studentsCount: 1 } }
        ).exec();
      }
    } catch (error) {
      if (
        typeof error !== "object" ||
        error === null ||
        !("code" in error) ||
        error.code !== 11000
      ) {
        throw error;
      }
      await Enrollment.updateOne(
        { user: order.user, course: item.course },
        { $set: { status: "active", order: order._id } }
      ).exec();
    }
  }

  const updated = await Order.findOneAndUpdate(
    { _id: order._id, status: "pending" },
    {
      $set: {
        status: "paid",
        transactionId: payment.transactionId,
      },
    },
    { returnDocument: "after" }
  )
    .select("_id")
    .lean()
    .exec();
  if (!updated) {
    const current = await Order.findById(order._id).select("status").lean().exec();
    return current?.status === "paid"
      ? { kind: "already-paid" as const }
      : { kind: "not-pending" as const };
  }
  return { kind: "paid" as const };
}
