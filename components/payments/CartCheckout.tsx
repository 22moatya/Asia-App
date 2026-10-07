"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const CART_STORAGE_KEY = "asia-lms-cart";

type CartItem = {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  price: number;
};

type CartQuote = { items: CartItem[]; total: number; currency: string };

function readCart() {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(CART_STORAGE_KEY) ?? "[]"
    );
    if (!Array.isArray(parsed)) return [];
    return [
      ...new Set(
        parsed.filter(
          (value): value is string => typeof value === "string"
        )
      ),
    ].slice(0, 20);
  } catch {
    return [];
  }
}

export function CartCheckout() {
  const [courseIds, setCourseIds] = useState<string[]>([]);
  const [quote, setQuote] = useState<CartQuote | null>(null);
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);

  useEffect(() => {
    Promise.resolve().then(() => {
      const storedCourseIds = readCart();
      setCourseIds(storedCourseIds);
      if (!storedCourseIds.length) setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!courseIds.length) return;
    let cancelled = false;
    fetch("/api/cart/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ courseIds }),
      cache: "no-store",
    })
      .then(async (response) => {
        const result: {
          success: boolean;
          message?: string;
          data?: CartQuote;
        } = await response.json();
        if (!response.ok || !result.success || !result.data) {
          if (response.status === 401) setLoginRequired(true);
          throw new Error(result.message || "تعذّر تحديث أسعار السلة.");
        }
        if (!cancelled) {
          setQuote(result.data);
          setMessage("");
          setLoginRequired(false);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMessage(
            error instanceof Error
              ? error.message
              : "تعذّر تحديث أسعار السلة."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [courseIds]);

  function removeCourse(courseId: string) {
    const updated = courseIds.filter((id) => id !== courseId);
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(updated));
    if (!updated.length) setQuote(null);
    setCourseIds(updated);
  }

  async function checkout() {
    if (!courseIds.length) return;
    setCheckingOut(true);
    setMessage("");
    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          courseIds,
          checkoutKey: window.crypto.randomUUID(),
          customerPhone: phone,
        }),
      });
      const result: {
        success: boolean;
        message?: string;
        data?: { sessionUrl: string };
      } = await response.json();
      if (!response.ok || !result.success || !result.data?.sessionUrl) {
        if (response.status === 401) setLoginRequired(true);
        throw new Error(result.message || "تعذّر بدء الدفع.");
      }
      window.location.href = result.data.sessionUrl;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "تعذّر بدء الدفع.");
      setCheckingOut(false);
    }
  }

  if (loading) {
    return <section className="dashboard-panel" aria-busy="true">جارٍ تحميل السلة...</section>;
  }

  return (
    <section className="dashboard-panel cart-panel">
      {message ? (
        <p className="admin-form-error" role="alert">
          {message}{" "}
          {loginRequired ? (
            <Link className="text-link" href="/login?callbackUrl=%2Fcart">
              سجّل الدخول للمتابعة
            </Link>
          ) : null}
        </p>
      ) : null}
      {courseIds.length && quote?.items.length ? (
        <>
          <ul className="cart-items">
            {quote.items.map((item) => (
              <li key={item.id}>
                <div>
                  <Link href={`/courses/${item.slug}`}><strong>{item.title}</strong></Link>
                  <span>
                    {new Intl.NumberFormat("ar-EG", {
                      style: "currency",
                      currency: quote.currency,
                    }).format(item.price)}
                  </span>
                </div>
                <button
                  className="text-link danger-link"
                  onClick={() => removeCourse(item.id)}
                  type="button"
                >
                  إزالة
                </button>
              </li>
            ))}
          </ul>
          <label className="cart-phone-field">
            رقم الهاتف (اختياري)
            <input
              autoComplete="tel"
              maxLength={40}
              onChange={(event) => setPhone(event.target.value)}
              value={phone}
            />
          </label>
          <div className="cart-total">
            <strong>الإجمالي</strong>
            <strong>
              {new Intl.NumberFormat("ar-EG", {
                style: "currency",
                currency: quote.currency,
              }).format(quote.total)}
            </strong>
          </div>
          <p className="cart-security-note">
            يُحسب السعر النهائي على الخادم. لن تُفعّل الدورة إلا بعد التحقق من
            الدفع.
          </p>
          <button
            className="button button-primary"
            disabled={checkingOut}
            onClick={checkout}
            type="button"
          >
            {checkingOut ? "جارٍ التحويل إلى الدفع..." : "المتابعة إلى الدفع الآمن"}
          </button>
        </>
      ) : (
        <div className="dashboard-empty">
          <p>
            {courseIds.length
              ? message || "تعذّر التحقق من الدورات في السلة."
              : "سلة المشتريات فارغة."}
          </p>
          <Link className="button button-primary" href="/courses">استكشف الدورات</Link>
        </div>
      )}
    </section>
  );
}
