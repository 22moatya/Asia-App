"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  isActive: boolean;
  order: number;
  courseCount: number;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
}

export function CategoryManager({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");
    setIsCreating(true);
    const form = event.currentTarget;
    const formData = new FormData(form);

    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          slug: String(formData.get("slug") ?? ""),
          description: String(formData.get("description") ?? ""),
          image: String(formData.get("image") ?? ""),
          isActive: formData.get("isActive") === "on",
          order: Number(formData.get("order") || 0),
        }),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.success) {
        setError(result.message ?? "تعذّر إنشاء التصنيف.");
        return;
      }
      form.reset();
      setMessage("تم إنشاء التصنيف.");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setIsCreating(false);
    }
  }

  async function updateCategory(id: string, patch: Record<string, unknown>) {
    setBusyId(id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.success) {
        setError(result.message ?? "تعذّر تحديث التصنيف.");
        return;
      }
      setMessage("تم تحديث التصنيف.");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setBusyId("");
    }
  }

  async function deleteCategory(category: CategoryRow) {
    if (category.courseCount > 0) {
      setError("لا يمكن حذف تصنيف مرتبط بدورات. عطّله بدلاً من ذلك.");
      return;
    }
    if (!window.confirm(`حذف التصنيف «${category.name}»؟`)) return;

    setBusyId(category.id);
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "DELETE",
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.success) {
        setError(result.message ?? "تعذّر حذف التصنيف.");
        return;
      }
      setMessage("تم حذف التصنيف.");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setBusyId("");
    }
  }

  async function updateCategoryDetails(
    event: FormEvent<HTMLFormElement>,
    category: CategoryRow
  ) {
    event.preventDefault();
    setBusyId(category.id);
    setError("");
    setMessage("");
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(formData.get("name") ?? ""),
          slug: String(formData.get("slug") ?? ""),
          description: String(formData.get("description") ?? ""),
          image: String(formData.get("image") ?? ""),
          isActive: category.isActive,
          order: Number(formData.get("order") || 0),
        }),
      });
      const result = (await response.json()) as ApiResponse;
      if (!response.ok || !result.success) {
        setError(result.message ?? "تعذّر تحديث بيانات التصنيف.");
        return;
      }
      setMessage("تم تحديث بيانات التصنيف.");
      router.refresh();
    } catch {
      setError("تعذّر الاتصال بالخادم.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div className="admin-category-layout">
      <form className="admin-editor admin-panel" onSubmit={handleCreate}>
        <div className="admin-panel-heading">
          <div>
            <h2>إضافة تصنيف</h2>
            <p>استخدم رابطاً مختصراً بأحرف إنجليزية.</p>
          </div>
        </div>
        <div className="admin-editor-grid">
          <label className="admin-field">
            اسم التصنيف
            <input
              maxLength={100}
              minLength={2}
              name="name"
              required
            />
          </label>
          <label className="admin-field">
            الرابط (Slug)
            <input
              maxLength={120}
              name="slug"
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              placeholder="web-development"
              required
            />
          </label>
          <label className="admin-field admin-field-full">
            وصف التصنيف
            <textarea maxLength={500} name="description" rows={3} />
          </label>
          <label className="admin-field admin-field-full">
            رابط الصورة (اختياري)
            <input maxLength={2000} name="image" type="url" />
          </label>
          <label className="admin-field">
            ترتيب العرض
            <input defaultValue={0} min={0} name="order" type="number" />
          </label>
          <label className="admin-checkbox">
            <input defaultChecked name="isActive" type="checkbox" />
            تصنيف نشط
          </label>
        </div>
        <div className="admin-form-actions">
          <button
            className="button button-primary"
            disabled={isCreating}
            type="submit"
          >
            {isCreating ? "جارٍ الحفظ..." : "إضافة التصنيف"}
          </button>
        </div>
      </form>

      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>التصنيفات</h2>
            <p>{categories.length.toLocaleString("ar-EG")} تصنيف</p>
          </div>
        </div>
        {message ? (
          <p className="admin-form-success" role="status">
            {message}
          </p>
        ) : null}
        {error ? (
          <p className="admin-form-error" role="alert">
            {error}
          </p>
        ) : null}
        {categories.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">التصنيف</th>
                  <th scope="col">الدورات</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr key={category.id}>
                    <td>
                      <strong>{category.name}</strong>
                      <small className="table-subtitle">{category.slug}</small>
                    </td>
                    <td>{category.courseCount.toLocaleString("ar-EG")}</td>
                    <td>
                      <span
                        className={`status-badge ${category.isActive ? "status-active" : "status-inactive"}`}
                      >
                        {category.isActive ? "نشط" : "معطّل"}
                      </span>
                    </td>
                    <td>
                      <div className="table-actions">
                        <details className="category-edit-details">
                          <summary>تعديل</summary>
                          <form
                            className="category-edit-form"
                            onSubmit={(event) =>
                              void updateCategoryDetails(event, category)
                            }
                          >
                            <label>
                              الاسم
                              <input
                                defaultValue={category.name}
                                maxLength={100}
                                minLength={2}
                                name="name"
                                required
                              />
                            </label>
                            <label>
                              الرابط (Slug)
                              <input
                                defaultValue={category.slug}
                                maxLength={120}
                                name="slug"
                                pattern="[a-z0-9]+(-[a-z0-9]+)*"
                                required
                              />
                            </label>
                            <label>
                              الوصف
                              <textarea
                                defaultValue={category.description}
                                maxLength={500}
                                name="description"
                                rows={2}
                              />
                            </label>
                            <label>
                              رابط الصورة
                              <input
                                defaultValue={category.image}
                                maxLength={2000}
                                name="image"
                                type="url"
                              />
                            </label>
                            <label>
                              الترتيب
                              <input
                                defaultValue={category.order}
                                min={0}
                                name="order"
                                type="number"
                              />
                            </label>
                            <button
                              className="button button-primary"
                              disabled={busyId === category.id}
                              type="submit"
                            >
                              حفظ
                            </button>
                          </form>
                        </details>
                        <button
                          className="table-action"
                          disabled={busyId === category.id}
                          onClick={() =>
                            void updateCategory(category.id, {
                              isActive: !category.isActive,
                            })
                          }
                          type="button"
                        >
                          {category.isActive ? "تعطيل" : "تفعيل"}
                        </button>
                        <button
                          className="table-action table-action-danger"
                          disabled={
                            busyId === category.id || category.courseCount > 0
                          }
                          onClick={() => void deleteCategory(category)}
                          type="button"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <p>لم تتم إضافة تصنيفات بعد.</p>
          </div>
        )}
      </section>
    </div>
  );
}
