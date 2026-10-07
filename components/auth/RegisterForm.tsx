"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface RegistrationResponse {
  success?: boolean;
  message?: string;
}

export function RegisterForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") ?? "");
    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const confirmPassword = String(formData.get("confirmPassword") ?? "");

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, confirmPassword }),
      });
      const result = (await response.json()) as RegistrationResponse;
      if (!response.ok || !result.success) {
        setError(result.message ?? "تعذّر إنشاء الحساب.");
        return;
      }

      const loginResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (!loginResult || loginResult.error) {
        router.replace("/login");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم. حاول مرة أخرى.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="auth-card">
      <span className="eyebrow">ابدأ رحلة التعلّم</span>
      <h1>إنشاء حساب طالب</h1>
      <p>أنشئ حسابك للانضمام إلى المنصة.</p>
      <form className="auth-form" onSubmit={handleSubmit}>
        <label>
          الاسم الكامل
          <input
            autoComplete="name"
            maxLength={100}
            minLength={2}
            name="name"
            required
            type="text"
          />
        </label>
        <label>
          البريد الإلكتروني
          <input
            autoComplete="email"
            maxLength={254}
            name="email"
            required
            type="email"
          />
        </label>
        <label>
          كلمة المرور
          <input
            autoComplete="new-password"
            maxLength={128}
            minLength={8}
            name="password"
            required
            type="password"
          />
        </label>
        <label>
          تأكيد كلمة المرور
          <input
            autoComplete="new-password"
            maxLength={128}
            minLength={8}
            name="confirmPassword"
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
          {isSubmitting ? "جارٍ إنشاء الحساب..." : "إنشاء حساب"}
        </button>
      </form>
      <p className="auth-footer">
        لديك حساب بالفعل؟ <Link href="/login">تسجيل الدخول</Link>
      </p>
    </section>
  );
}
