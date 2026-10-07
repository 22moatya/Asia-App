"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const CART_STORAGE_KEY = "asia-lms-cart";

type OrderView = {
  status: "pending" | "paid" | "failed" | "cancelled" | "refunded";
  items: { course: string }[];
};

export function PaymentReturnStatus({ orderId }: { orderId: string }) {
  const [order, setOrder] = useState<OrderView | null>(null);
  const [message, setMessage] = useState("جارٍ التحقق من حالة الدفع من الخادم...");
  const [loading, setLoading] = useState(true);

  const refreshStatus = useCallback(async () => {
    const verified = await fetch(`/api/orders/${orderId}/verify`, {
      method: "POST",
      cache: "no-store",
    });
    const verification: {
      success: boolean;
      message?: string;
      data?: { status: string };
    } = await verified.json();
    if (!verified.ok && verified.status !== 409) {
      throw new Error(verification.message || "تعذّر التحقق من الدفع.");
    }
    const response = await fetch(`/api/orders/${orderId}`, {
      cache: "no-store",
    });
    const result: {
      success: boolean;
      message?: string;
      data?: OrderView;
    } = await response.json();
    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || "تعذّر تحميل تفاصيل الطلب.");
    }
    setOrder(result.data);
    if (result.data.status === "paid") {
      const courseIds = new Set(result.data.items.map((item) => item.course));
      try {
        const cart: unknown = JSON.parse(
          window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"
        );
        if (Array.isArray(cart)) {
          window.localStorage.setItem(
            CART_STORAGE_KEY,
            JSON.stringify(
              cart.filter(
                (id): id is string =>
                  typeof id === "string" && !courseIds.has(id)
              )
            )
          );
        }
      } catch {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      }
      setMessage("تم التحقق من الدفع وتفعيل مقرراتك.");
    } else if (result.data.status === "pending") {
      setMessage("لم يصل تأكيد الدفع بعد. يمكنك إعادة التحقق بعد لحظات.");
    } else {
      setMessage("لم يكتمل الدفع لهذا الطلب.");
    }
  }, [orderId]);

  useEffect(() => {
    Promise.resolve()
      .then(refreshStatus)
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error ? error.message : "تعذّر التحقق من الدفع."
        );
      })
      .finally(() => setLoading(false));
  }, [refreshStatus]);

  return (
    <section className="dashboard-panel payment-return-panel" aria-live="polite">
      <span className={`payment-state-icon ${order?.status ?? "pending"}`} aria-hidden="true">
        {order?.status === "paid" ? "✓" : order?.status === "failed" ? "!" : "…"}
      </span>
      <h1>
        {order?.status === "paid"
          ? "اكتمل الدفع"
          : order?.status === "failed"
            ? "تعذّر إتمام الدفع"
            : "جارٍ تأكيد الطلب"}
      </h1>
      <p>{message}</p>
      {order?.status === "paid" ? (
        <div className="actions">
          {order.items.map((item) => (
            <Link
              className="button button-primary"
              href={`/dashboard/courses/${item.course}`}
              key={item.course}
            >
              ابدأ التعلّم
            </Link>
          ))}
          <Link className="button button-secondary" href="/dashboard/orders">عرض طلباتي</Link>
        </div>
      ) : (
        <div className="actions">
          <button
            className="button button-primary"
            disabled={loading}
            onClick={() => {
              setLoading(true);
              refreshStatus()
                .catch((error: unknown) => {
                  setMessage(error instanceof Error ? error.message : "تعذّر التحقق من الدفع.");
                })
                .finally(() => setLoading(false));
            }}
            type="button"
          >
            {loading ? "جارٍ التحقق..." : "إعادة التحقق"}
          </button>
          <Link className="button button-secondary" href="/dashboard/orders">عرض طلباتي</Link>
        </div>
      )}
    </section>
  );
}
