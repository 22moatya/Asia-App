"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface CategoryOption {
  id: string;
  name: string;
}

interface CourseDraft {
  id?: string;
  title?: string;
  slug?: string;
  shortDescription?: string;
  description?: string;
  thumbnail?: string;
  category?: string;
  instructor?: string;
  price?: number;
  originalPrice?: number;
  level?: "beginner" | "intermediate" | "advanced";
  language?: string;
  durationMinutes?: number;
  lessonsCount?: number;
  requirements?: string[];
  learningOutcomes?: string[];
  tags?: string[];
  featured?: boolean;
  status?: "draft" | "published" | "archived";
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  data?: { id?: string; slug?: string };
  errors?: Record<string, string[] | undefined>;
}

function listValue(value: FormDataEntryValue | null): string[] {
  return String(value ?? "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function CourseEditor({
  categories,
  course,
}: {
  categories: CategoryOption[];
  course?: CourseDraft;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isArchiving, setIsArchiving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSaving(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    const payload = {
      title: String(formData.get("title") ?? ""),
      slug: String(formData.get("slug") ?? ""),
      shortDescription: String(formData.get("shortDescription") ?? ""),
      description: String(formData.get("description") ?? ""),
      thumbnail: String(formData.get("thumbnail") ?? ""),
      category: String(formData.get("category") ?? ""),
      instructor: String(formData.get("instructor") ?? ""),
      price: Number(formData.get("price")),
      originalPrice: Number(formData.get("originalPrice")),
      level: String(formData.get("level") ?? ""),
      language: String(formData.get("language") ?? ""),
      durationMinutes: Number(formData.get("durationMinutes") || 0),
      lessonsCount: Number(formData.get("lessonsCount") || 0),
      requirements: listValue(formData.get("requirements")),
      learningOutcomes: listValue(formData.get("learningOutcomes")),
      tags: listValue(formData.get("tags")),
      featured: formData.get("featured") === "on",
      status: String(formData.get("status") ?? "draft"),
    };

    try {
      const response = await fetch(
        course?.id ? `/api/admin/courses/${course.id}` : "/api/admin/courses",
        {
          method: course?.id ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.success) {
        const details = result.errors
          ? Object.entries(result.errors)
              .flatMap(([field, messages]) =>
                (messages ?? []).map((message) => `${field}: ${message}`)
              )
              .join(" ")
          : "";
        setError([result.message, details].filter(Boolean).join(" "));
        return;
      }

      router.replace("/admin/courses");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم. تحقق من اتصالك وحاول مرة أخرى.");
    } finally {
      setIsSaving(false);
    }
  }

  async function archiveCourse() {
    if (!course?.id || !window.confirm("هل تريد أرشفة هذه الدورة؟")) return;
    setError("");
    setIsArchiving(true);
    try {
      const response = await fetch(`/api/admin/courses/${course.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.success) {
        setError(result.message ?? "تعذّرت أرشفة الدورة.");
        return;
      }
      router.replace("/admin/courses");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم أثناء أرشفة الدورة.");
    } finally {
      setIsArchiving(false);
    }
  }

  return (
    <form className="admin-editor admin-panel" onSubmit={handleSubmit}>
      <div className="admin-editor-grid">
        <label className="admin-field">
          عنوان الدورة
          <input
            defaultValue={course?.title}
            maxLength={200}
            minLength={2}
            name="title"
            required
          />
        </label>
        <label className="admin-field">
          الرابط (Slug)
          <input
            defaultValue={course?.slug}
            maxLength={220}
            name="slug"
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="مثل: modern-web-development"
            required
          />
          <small>أحرف إنجليزية صغيرة وأرقام وشرطات فقط.</small>
        </label>
        <label className="admin-field admin-field-full">
          وصف مختصر
          <input
            defaultValue={course?.shortDescription}
            maxLength={300}
            name="shortDescription"
            required
          />
        </label>
        <label className="admin-field admin-field-full">
          الوصف الكامل
          <textarea
            defaultValue={course?.description}
            maxLength={20000}
            minLength={1}
            name="description"
            required
            rows={6}
          />
        </label>
        <label className="admin-field">
          التصنيف
          <select defaultValue={course?.category ?? ""} name="category" required>
            <option disabled value="">
              اختر تصنيفاً
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
        <label className="admin-field">
          المدرّب
          <input
            defaultValue={course?.instructor}
            maxLength={150}
            minLength={2}
            name="instructor"
            required
          />
        </label>
        <label className="admin-field">
          السعر الحالي (ج.م.)
          <input
            defaultValue={course?.price ?? 0}
            min="0"
            name="price"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="admin-field">
          السعر الأصلي (ج.م.)
          <input
            defaultValue={course?.originalPrice ?? 0}
            min="0"
            name="originalPrice"
            required
            step="0.01"
            type="number"
          />
        </label>
        <label className="admin-field">
          المستوى
          <select defaultValue={course?.level ?? "beginner"} name="level">
            <option value="beginner">مبتدئ</option>
            <option value="intermediate">متوسط</option>
            <option value="advanced">متقدم</option>
          </select>
        </label>
        <label className="admin-field">
          اللغة
          <input
            defaultValue={course?.language ?? "العربية"}
            maxLength={60}
            name="language"
            required
          />
        </label>
        <label className="admin-field">
          المدة بالدقائق
          <input
            defaultValue={course?.durationMinutes ?? 0}
            min="0"
            name="durationMinutes"
            type="number"
          />
        </label>
        <label className="admin-field">
          عدد الدروس
          <input
            defaultValue={course?.lessonsCount ?? 0}
            min="0"
            name="lessonsCount"
            type="number"
          />
        </label>
        <label className="admin-field admin-field-full">
          رابط صورة الغلاف
          <input
            defaultValue={course?.thumbnail}
            maxLength={2000}
            name="thumbnail"
            type="url"
          />
        </label>
        <label className="admin-field">
          المتطلبات (عنصر في كل سطر)
          <textarea
            defaultValue={course?.requirements?.join("\n")}
            name="requirements"
            rows={4}
          />
        </label>
        <label className="admin-field">
          مخرجات التعلّم (عنصر في كل سطر)
          <textarea
            defaultValue={course?.learningOutcomes?.join("\n")}
            name="learningOutcomes"
            rows={4}
          />
        </label>
        <label className="admin-field admin-field-full">
          الوسوم (وسم في كل سطر)
          <textarea
            defaultValue={course?.tags?.join("\n")}
            name="tags"
            rows={3}
          />
        </label>
        <label className="admin-field">
          حالة الدورة
          <select defaultValue={course?.status ?? "draft"} name="status">
            <option value="draft">مسودة</option>
            <option value="published">منشورة</option>
            <option value="archived">مؤرشفة</option>
          </select>
        </label>
        <label className="admin-checkbox">
          <input
            defaultChecked={course?.featured ?? false}
            name="featured"
            type="checkbox"
          />
          دورة مميزة
        </label>
      </div>
      {error ? (
        <p className="admin-form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="admin-form-actions">
        <button
          className="button button-primary"
          disabled={isSaving || categories.length === 0}
          type="submit"
        >
          {isSaving ? "جارٍ الحفظ..." : course?.id ? "حفظ التغييرات" : "إنشاء الدورة"}
        </button>
        {course?.id ? (
          <button
            className="button button-danger"
            disabled={isArchiving}
            onClick={() => void archiveCourse()}
            type="button"
          >
            {isArchiving ? "جارٍ الأرشفة..." : "أرشفة الدورة"}
          </button>
        ) : null}
      </div>
      {!categories.length ? (
        <p className="admin-form-error">
          أنشئ تصنيفاً نشطاً قبل إضافة دورة.
        </p>
      ) : null}
    </form>
  );
}
