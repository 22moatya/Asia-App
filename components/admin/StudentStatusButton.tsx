"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function StudentStatusButton({
  id,
  isActive,
}: {
  id: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function updateStatus() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/admin/students/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !isActive }),
      });
      const result = (await response.json()) as {
        success?: boolean;
        message?: string;
      };
      if (!response.ok || !result.success) {
        setError(result.message ?? "تعذّر تحديث حالة الطالب.");
        return;
      }
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="student-status-action">
      <button
        className={`table-action${isActive ? " table-action-danger" : ""}`}
        disabled={busy}
        onClick={() => void updateStatus()}
        type="button"
      >
        {busy ? "جارٍ الحفظ..." : isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
      </button>
      {error ? (
        <span className="admin-form-error" role="alert">
          {error}
        </span>
      ) : null}
    </span>
  );
}
