import { NextResponse } from "next/server";
import {
  asRecord,
  getKashierConfiguration,
  isValidKashierWebhookSignature,
} from "@/lib/kashier";
import { connectDB } from "@/lib/mongodb";
import { fulfillVerifiedOrder } from "@/lib/payment-fulfillment";
import { Order } from "@/models/Order";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const root = asRecord(body);
  const data = asRecord(root?.data);
  if (!root || !data) {
    return new NextResponse(null, { status: 400 });
  }

  let configuration;
  try {
    configuration = getKashierConfiguration();
  } catch (error) {
    console.error("Kashier webhook received without valid server configuration.", error);
    return new NextResponse(null, { status: 503 });
  }
  if (
    !isValidKashierWebhookSignature(
      data,
      request.headers.get("x-kashier-signature"),
      configuration.paymentApiKey
    )
  ) {
    console.error("Rejected a Kashier webhook with an invalid signature.");
    return new NextResponse(null, { status: 401 });
  }

  if (root.event !== "pay") return new NextResponse(null, { status: 200 });
  if (
    typeof data.merchantOrderId !== "string" ||
    typeof data.status !== "string"
  ) {
    return new NextResponse(null, { status: 400 });
  }
  let order;
  try {
    await connectDB();
    order = await Order.findOne({
      merchantOrderId: data.merchantOrderId,
    })
      .select("_id status")
      .lean()
      .exec();
  } catch (error) {
    console.error("Failed to look up the order for a verified Kashier webhook.", error);
    return new NextResponse(null, { status: 503 });
  }
  if (!order) {
    console.error("Verified Kashier webhook does not match a local order.", {
      merchantOrderId: data.merchantOrderId,
    });
    return new NextResponse(null, { status: 404 });
  }

  if (data.status === "FAILURE") {
    if (order.status !== "pending") {
      return new NextResponse(null, { status: 409 });
    }
    await Order.updateOne(
      { _id: order._id, status: "pending" },
      { $set: { status: "failed" } }
    ).exec();
    return new NextResponse(null, { status: 200 });
  }
  if (data.status !== "SUCCESS") {
    return new NextResponse(null, { status: 200 });
  }
  if (
    typeof data.amount !== "number" ||
    typeof data.currency !== "string" ||
    typeof data.transactionId !== "string"
  ) {
    return new NextResponse(null, { status: 400 });
  }

  try {
    const result = await fulfillVerifiedOrder(order._id.toString(), {
      amount: data.amount,
      currency: data.currency,
      merchantOrderId: data.merchantOrderId,
      transactionId: data.transactionId,
    });
    if (result.kind === "already-paid") {
      return new NextResponse(null, { status: 409 });
    }
    if (result.kind !== "paid") {
      console.error("Kashier payment webhook could not fulfill the order.", {
        orderId: order._id.toString(),
        result: result.kind,
      });
      return new NextResponse(null, { status: 422 });
    }
    return new NextResponse(null, { status: 200 });
  } catch (error) {
    console.error("Failed to fulfill a verified Kashier payment webhook.", error);
    return new NextResponse(null, { status: 503 });
  }
}
