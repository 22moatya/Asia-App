"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

export function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    try {
      const result = await signIn("credentials", {
        email: formData.get("email"),
        password: formData.get("password"),
        redirect: false,
      });

      if (!result || result.error) {
        setError("تعذّر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("حدث خطأ غير متوقع أثناء تسجيل الدخول.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <span className="eyebrow">مرحبًا بعودتك</span>
      <h1>تسجيل الدخول</h1>
      <p>أدخل بيانات حسابك للمتابعة.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          البريد الإلكتروني
          <input
            autoComplete="email"
            name="email"
            required
            type="email"
          />
        </label>
        <label>
          كلمة المرور
          <input
            autoComplete="current-password"
            name="password"
            required
            type="password"
          />
        </label>
        {error ? (
          <p className="form-message" role="alert">
            {error}
          </p>
        ) : null}
        <button
          className="button button-primary"
          disabled={isSubmitting}
          type="submit"
        >
          {isSubmitting ? "جارٍ تسجيل الدخول..." : "تسجيل الدخول"}
        </button>
      </form>
      <p className="auth-footer">
        ليس لديك حساب؟ <Link href="/register">إنشاء حساب طالب</Link>
      </p>
    </section>
  );
}
