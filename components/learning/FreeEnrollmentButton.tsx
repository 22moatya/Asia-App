"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function FreeEnrollmentButton({ courseId }: { courseId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [loginRequired, setLoginRequired] = useState(false);

  async function enroll() {
    setLoading(true);
    setMessage("");
    setLoginRequired(false);
    try {
      const response = await fetch("/api/enrollments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ courseId }),
      });
      const result: { success: boolean; message: string } =
        await response.json();
      if (!response.ok || !result.success) {
        setMessage(result.message || "تعذّر التسجيل في الدورة.");
        setLoginRequired(response.status === 401);
        return;
      }
      router.push(`/dashboard/courses/${courseId}`);
    } catch {
      setMessage("تعذّر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="enrollment-action">
      <button
        className="button button-primary purchase-button"
        disabled={loading}
        onClick={enroll}
        type="button"
      >
        {loading ? "جارٍ التسجيل..." : "التحق بالدورة مجاناً"}
      </button>
      {message ? (
        <p aria-live="polite" className="admin-form-error" role="alert">
          {message}{" "}
          {loginRequired ? (
            <Link className="text-link" href="/login">
              سجّل الدخول
            </Link>
          ) : null}
        </p>
      ) : null}
    </div>
  );
}
