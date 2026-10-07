import mongoose from "mongoose";
import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import {
  getKashierConfiguration,
  getPaymentSessionId,
  getPublicAppUrl,
  KashierConfigurationError,
  asRecord,
} from "@/lib/kashier";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Course } from "@/models/Course";
import { Enrollment } from "@/models/Enrollment";
import { Order } from "@/models/Order";

function validCheckoutInput(value: unknown): value is {
  courseIds: string[];
  checkoutKey: string;
  customerPhone?: string;
} {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return false;
  }
  const input = value as Record<string, unknown>;
  return (
    Array.isArray(input.courseIds) &&
    input.courseIds.length > 0 &&
    input.courseIds.length <= 20 &&
    input.courseIds.every(
      (id) => typeof id === "string" && mongoose.isValidObjectId(id)
    ) &&
    new Set(input.courseIds).size === input.courseIds.length &&
    typeof input.checkoutKey === "string" &&
    /^[a-f\d-]{36}$/i.test(input.checkoutKey) &&
    (input.customerPhone === undefined ||
      (typeof input.customerPhone === "string" &&
        input.customerPhone.length <= 40))
  );
}

function sessionUrlFromResponse(value: unknown) {
  const root = asRecord(value);
  const data = asRecord(root?.data);
  const sessionUrl =
    (typeof data?.sessionUrl === "string" && data.sessionUrl) ||
    (typeof root?.sessionUrl === "string" && root.sessionUrl) ||
    "";
  return sessionUrl && getPaymentSessionId(sessionUrl) ? sessionUrl : null;
}

export async function POST(request: Request) {
  try {
    const authorization = await requireAuth();
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
    if (!validCheckoutInput(body)) {
      return NextResponse.json(
        { success: false, message: "Checkout details are invalid." },
        { status: 422 }
      );
    }

    const configuration = getKashierConfiguration();
    const applicationUrl = getPublicAppUrl();
    await connectDB();
    const existingOrder = await Order.findOne({
      user: authorization.user.id,
      checkoutKey: body.checkoutKey,
    })
      .select("status paymentSessionUrl _id")
      .lean()
      .exec();
    if (existingOrder) {
      if (existingOrder.status === "pending" && existingOrder.paymentSessionUrl) {
        return NextResponse.json({
          success: true,
          message: "Checkout session retrieved.",
          data: {
            orderId: existingOrder._id.toString(),
            sessionUrl: existingOrder.paymentSessionUrl,
          },
        });
      }
      return NextResponse.json(
        { success: false, message: "This checkout attempt cannot be reused." },
        { status: 409 }
      );
    }

    const [courses, enrollments, activeCategories] = await Promise.all([
      Course.find({
        _id: { $in: body.courseIds },
        status: "published",
        price: { $gt: 0 },
      })
        .select("title slug price category")
        .lean()
        .exec(),
      Enrollment.find({
        user: authorization.user.id,
        course: { $in: body.courseIds },
        status: "active",
      })
        .select("course")
        .lean()
        .exec(),
      Category.find({ isActive: true }).select("_id").lean().exec(),
    ]);
    const activeCategoryIds = new Set(
      activeCategories.map((category) => category._id.toString())
    );
    const enrolledIds = new Set(
      enrollments.map((enrollment) => enrollment.course.toString())
    );
    const availableCourses = courses.filter(
      (course) =>
        activeCategoryIds.has(course.category.toString()) &&
        !enrolledIds.has(course._id.toString())
    );
    if (availableCourses.length !== body.courseIds.length) {
      return NextResponse.json(
        {
          success: false,
          message:
            "One or more courses are unavailable, free, or already in your library.",
        },
        { status: 422 }
      );
    }
    const items = availableCourses.map((course) => ({
      course: course._id,
      title: course.title,
      slug: course.slug,
      price: course.price,
    }));
    const total =
      Math.round(items.reduce((sum, item) => sum + item.price, 0) * 100) / 100;
    if (!Number.isFinite(total) || total <= 0) {
      return NextResponse.json(
        { success: false, message: "The checkout total is invalid." },
        { status: 422 }
      );
    }

    const order = await Order.create({
      user: authorization.user.id,
      items,
      subtotal: total,
      discount: 0,
      total,
      currency: "EGP",
      status: "pending",
      provider: "kashier",
      merchantOrderId: `ASIA-${new mongoose.Types.ObjectId().toString()}`,
      checkoutKey: body.checkoutKey,
      customerName: authorization.user.name,
      customerEmail: authorization.user.email,
      customerPhone: body.customerPhone?.trim() ?? "",
    });

    const webhookUrl = new URL("/api/payments/kashier/webhook", applicationUrl);
    const payload = {
      amount: total.toFixed(2),
      currency: "EGP",
      order: order.merchantOrderId,
      merchantId: configuration.merchantId,
      merchantRedirect: new URL(
        `/checkout/return?orderId=${order._id.toString()}`,
        applicationUrl
      ).toString(),
      type: "one-time",
      allowedMethods: "card,wallet",
      maxFailureAttempts: 3,
      expireAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      description: `Asia LMS order ${order._id.toString()}`,
      customer: {
        email: authorization.user.email,
        reference: authorization.user.id,
      },
      ...(["localhost", "127.0.0.1"].includes(
        new URL(applicationUrl).hostname
      )
        ? {}
        : { serverWebhook: webhookUrl.toString() }),
    };

    let response: Response;
    try {
      response = await fetch(`${configuration.apiUrl}/v3/payment/sessions`, {
        method: "POST",
        headers: {
          Authorization: configuration.secretKey,
          "api-key": configuration.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15000),
        cache: "no-store",
      });
    } catch (error) {
      await Order.updateOne(
        { _id: order._id, status: "pending" },
        { $set: { status: "failed" } }
      ).exec();
      throw error;
    }
    const gatewayBody: unknown = await response.json().catch(() => null);
    const sessionUrl = response.ok ? sessionUrlFromResponse(gatewayBody) : null;
    const sessionId = sessionUrl ? getPaymentSessionId(sessionUrl) : null;
    if (!response.ok || !sessionUrl || !sessionId) {
      await Order.updateOne(
        { _id: order._id, status: "pending" },
        { $set: { status: "failed" } }
      ).exec();
      console.error("Kashier did not return a valid payment session.", {
        status: response.status,
      });
      return NextResponse.json(
        { success: false, message: "The payment provider could not start checkout." },
        { status: 502 }
      );
    }
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          paymentSessionId: sessionId,
          paymentSessionUrl: sessionUrl,
        },
      }
    ).exec();
    return NextResponse.json({
      success: true,
      message: "Payment session created.",
      data: { orderId: order._id.toString(), sessionUrl },
    });
  } catch (error) {
    if (error instanceof KashierConfigurationError) {
      console.error("Kashier checkout is unavailable because server configuration is incomplete.");
      return NextResponse.json(
        { success: false, message: "Online checkout is not configured yet." },
        { status: 503 }
      );
    }
    console.error("Failed to create Kashier checkout.", error);
    return NextResponse.json(
      { success: false, message: "Unable to start checkout right now." },
      { status: 503 }
    );
  }
}
