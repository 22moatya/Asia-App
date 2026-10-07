import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  asRecord,
  getKashierConfiguration,
  KashierConfigurationError,
} from "@/lib/kashier";
import { connectDB } from "@/lib/mongodb";
import { fulfillVerifiedOrder } from "@/lib/payment-fulfillment";
import { Order } from "@/models/Order";

export async function POST(
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
    const configuration = getKashierConfiguration();
    await connectDB();
    const order = await Order.findOne({
      _id: orderId,
      user: authorization.user.id,
    })
      .select("status paymentSessionId merchantOrderId")
      .lean()
      .exec();
    if (!order) {
      return NextResponse.json(
        { success: false, message: "Order not found." },
        { status: 404 }
      );
    }
    if (order.status === "paid") {
      return NextResponse.json({
        success: true,
        message: "Payment was verified.",
        data: { status: "paid" },
      });
    }
    if (order.status !== "pending" || !order.paymentSessionId) {
      return NextResponse.json(
        { success: false, message: "This order has no pending payment session." },
        { status: 409 }
      );
    }
    const response = await fetch(
      `${configuration.apiUrl}/v3/payment/sessions/${encodeURIComponent(order.paymentSessionId)}/payment`,
      {
        headers: { Authorization: configuration.secretKey },
        cache: "no-store",
        signal: AbortSignal.timeout(12000),
      }
    );
    if (!response.ok) {
      console.error("Kashier payment verification returned an error.", {
        status: response.status,
      });
      return NextResponse.json(
        { success: false, message: "Payment status could not be verified yet." },
        { status: 502 }
      );
    }
    const result = asRecord(await response.json());
    const payment = asRecord(result?.data);
    if (!payment) {
      console.error("Kashier payment verification returned an unexpected response.");
      return NextResponse.json(
        { success: false, message: "Payment status could not be verified yet." },
        { status: 502 }
      );
    }
    if (payment.status !== "SUCCESS") {
      return NextResponse.json({
        success: true,
        message: "Payment is not confirmed yet.",
        data: { status: "pending" },
      });
    }
    const amount =
      typeof payment.amount === "number"
        ? payment.amount
        : typeof payment.amount === "string"
          ? Number(payment.amount)
          : NaN;
    const currency =
      typeof payment.currency === "string" ? payment.currency : "";
    const merchantOrderId =
      typeof payment.merchantOrderId === "string"
        ? payment.merchantOrderId
        : typeof payment.order === "string"
          ? payment.order
          : "";
    const transactionId =
      typeof payment.transactionId === "string" ? payment.transactionId : "";
    if (
      !Number.isFinite(amount) ||
      !currency ||
      merchantOrderId !== order.merchantOrderId ||
      !transactionId
    ) {
      console.error("Kashier verified payment does not match the stored order.", {
        orderId,
      });
      return NextResponse.json(
        { success: false, message: "Payment details did not match this order." },
        { status: 409 }
      );
    }
    const fulfillment = await fulfillVerifiedOrder(orderId, {
      amount,
      currency,
      merchantOrderId,
      transactionId,
    });
    if (
      fulfillment.kind !== "paid" &&
      fulfillment.kind !== "already-paid"
    ) {
      console.error("Verified Kashier payment could not fulfill the order.", {
        orderId,
        result: fulfillment.kind,
      });
      return NextResponse.json(
        { success: false, message: "Payment is verified but access could not be activated." },
        { status: 503 }
      );
    }
    return NextResponse.json({
      success: true,
      message: "Payment was verified.",
      data: { status: "paid" },
    });
  } catch (error) {
    if (error instanceof KashierConfigurationError) {
      return NextResponse.json(
        { success: false, message: "Online checkout is not configured yet." },
        { status: 503 }
      );
    }
    console.error("Failed to verify Kashier order payment.", error);
    return NextResponse.json(
      { success: false, message: "Unable to verify payment right now." },
      { status: 503 }
    );
  }
}
