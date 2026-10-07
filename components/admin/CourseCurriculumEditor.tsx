"use client";

import { useCallback, useEffect, useState } from "react";

type Section = {
  _id: string;
  title: string;
  description: string;
  order: number;
};

type Lesson = {
  _id: string;
  section: string;
  title: string;
  description: string;
  type: "video" | "text" | "pdf" | "file";
  videoUrl: string;
  content: string;
  durationMinutes: number;
  resources: { title: string; url: string }[];
  isFree: boolean;
  order: number;
};

const failureMessage = "تعذّر إكمال العملية.";

export function CourseCurriculumEditor({
  courseId,
}: {
  courseId: string;
}) {
  const [sections, setSections] = useState<Section[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [editingLesson, setEditingLesson] = useState<Lesson | null>(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch(`/api/admin/courses/${courseId}/sections`, {
      cache: "no-store",
    });
    const result: {
      success: boolean;
      message?: string;
      data?: { sections: Section[]; lessons: Lesson[] };
    } = await response.json();
    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || "تعذّر تحميل المنهج.");
    }
    return result.data;
  }, [courseId]);

  useEffect(() => {
    load()
      .then((curriculum) => {
        setSections(curriculum.sections);
        setLessons(curriculum.lessons);
      })
      .catch((error: unknown) => {
        setMessage(error instanceof Error ? error.message : "تعذّر تحميل المنهج.");
      })
      .finally(() => setLoading(false));
  }, [load]);

  async function request(
    url: string,
    method: string,
    data?: Record<string, unknown>
  ) {
    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(url, {
        method,
        headers: data ? { "Content-Type": "application/json" } : undefined,
        body: data ? JSON.stringify(data) : undefined,
      });
      const result: { success: boolean; message?: string } =
        await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || failureMessage);
      }
      const curriculum = await load();
      setSections(curriculum.sections);
      setLessons(curriculum.lessons);
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : failureMessage);
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveSection(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!(await request(`/api/admin/courses/${courseId}/sections`, "POST", {
      title,
      description,
      order: sections.length,
    }))) return;
    setTitle("");
    setDescription("");
  }

  async function saveLesson(
    event: React.FormEvent<HTMLFormElement>,
    sectionId: string
  ) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    let resources: { title: string; url: string }[];
    try {
      resources = parseResources(String(formData.get("resources") ?? ""));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "صيغة المصادر الإضافية غير صحيحة."
      );
      return;
    }
    const lessonData = {
      sectionId,
      title: String(formData.get("title") ?? ""),
      description: String(formData.get("description") ?? ""),
      type: String(formData.get("type") ?? "video"),
      videoUrl: String(formData.get("videoUrl") ?? ""),
      content: String(formData.get("content") ?? ""),
      durationMinutes: Number(formData.get("durationMinutes") ?? 0),
      isFree: formData.get("isFree") === "on",
      order: Number(formData.get("order") ?? 0),
      resources,
    };
    const url = editingLesson
      ? `/api/admin/courses/${courseId}/lessons/${editingLesson._id}`
      : `/api/admin/courses/${courseId}/sections/${sectionId}/lessons`;
    if (await request(url, editingLesson ? "PUT" : "POST", lessonData)) {
      setActiveSection(null);
      setEditingLesson(null);
    }

    function parseResources(value: string) {
      return value
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => {
          const separator = line.indexOf("|");
          if (separator < 1) {
            throw new Error("اكتب كل مصدر بهذا الشكل: العنوان | https://example.com");
          }
          return {
            title: line.slice(0, separator).trim(),
            url: line.slice(separator + 1).trim(),
          };
        });
    }
  }

  if (loading) {
    return <section className="admin-panel" aria-busy="true">جارٍ تحميل المنهج...</section>;
  }

  return (
    <div className="curriculum-editor">
      <section className="admin-panel">
        <h2>إضافة قسم</h2>
        <form className="curriculum-form" onSubmit={saveSection}>
          <label>اسم القسم<input maxLength={200} onChange={(event) => setTitle(event.target.value)} required value={title} /></label>
          <label>وصف القسم<textarea maxLength={1000} onChange={(event) => setDescription(event.target.value)} value={description} /></label>
          <button className="button button-primary" disabled={saving} type="submit">إضافة القسم</button>
        </form>
      </section>
      {message ? <p className="admin-form-error" role="alert">{message}</p> : null}
      {sections.length ? sections.map((section) => {
        const sectionLessons = lessons.filter((lesson) => lesson.section === section._id);
        return (
          <section className="admin-panel curriculum-section" key={section._id}>
            <div className="admin-panel-heading">
              <div><h2>{section.title}</h2><p>{section.description || `${sectionLessons.length} درس`}</p></div>
              <div className="curriculum-actions">
                <button className="button button-secondary" disabled={saving} onClick={() => setActiveSection(activeSection === section._id ? null : section._id)} type="button">
                  {activeSection === section._id ? "إغلاق" : "إضافة درس"}
                </button>
                <details className="category-edit-details">
                  <summary>تعديل القسم</summary>
                  <form
                    className="category-edit-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      const formData = new FormData(event.currentTarget);
                      await request(
                        `/api/admin/courses/${courseId}/sections/${section._id}`,
                        "PATCH",
                        {
                          title: String(formData.get("title") ?? ""),
                          description: String(formData.get("description") ?? ""),
                          order: Number(formData.get("order") ?? section.order),
                        }
                      );
                    }}
                  >
                    <label>العنوان<input defaultValue={section.title} maxLength={200} name="title" required /></label>
                    <label>الوصف<textarea defaultValue={section.description} maxLength={1000} name="description" /></label>
                    <label>الترتيب<input defaultValue={section.order} min={0} name="order" type="number" /></label>
                    <button className="button button-secondary" disabled={saving} type="submit">حفظ</button>
                  </form>
                </details>
                <button
                  className="button button-danger"
                  disabled={saving}
                  onClick={async () => {
                    if (window.confirm("سيُحذف القسم وجميع دروسه. هل تريد المتابعة؟")) {
                      await request(`/api/admin/courses/${courseId}/sections/${section._id}`, "DELETE");
                    }
                  }}
                  type="button"
                >حذف</button>
              </div>
            </div>
            {sectionLessons.length ? (
              <ol className="curriculum-lesson-list">
                {sectionLessons.map((lesson) => (
                  <li key={lesson._id}>
                    <div>
                      <strong>{lesson.title}</strong>
                      <small>{lesson.type} · {lesson.durationMinutes} دقيقة{lesson.isFree ? " · مجاني" : ""}</small>
                    </div>
                    <div className="curriculum-actions">
                      <button className="text-link" onClick={() => { setEditingLesson(lesson); setActiveSection(section._id); }} type="button">تعديل</button>
                      <button
                        className="text-link danger-link"
                        disabled={saving}
                        onClick={async () => {
                          if (window.confirm("هل تريد حذف هذا الدرس؟")) {
                            await request(`/api/admin/courses/${courseId}/lessons/${lesson._id}`, "DELETE");
                          }
                        }}
                        type="button"
                      >حذف</button>
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className="admin-empty">لا توجد دروس في هذا القسم بعد.</p>}
            {activeSection === section._id ? (
              <form className="curriculum-form lesson-edit-form" onSubmit={(event) => saveLesson(event, section._id)}>
                <h3>{editingLesson ? "تعديل الدرس" : "إضافة درس"}</h3>
                <label>عنوان الدرس<input defaultValue={editingLesson?.title ?? ""} key={`title-${editingLesson?._id ?? section._id}`} maxLength={300} name="title" required /></label>
                <label>وصف مختصر<textarea defaultValue={editingLesson?.description ?? ""} key={`description-${editingLesson?._id ?? section._id}`} maxLength={2000} name="description" /></label>
                <label>نوع الدرس<select defaultValue={editingLesson?.type ?? "video"} key={`type-${editingLesson?._id ?? section._id}`} name="type"><option value="video">فيديو</option><option value="text">نص</option><option value="pdf">PDF</option><option value="file">ملف</option></select></label>
                <label>رابط الفيديو أو الملف<input defaultValue={editingLesson?.videoUrl ?? ""} key={`url-${editingLesson?._id ?? section._id}`} maxLength={2000} name="videoUrl" type="url" /></label>
                <label>محتوى الدرس النصي<textarea defaultValue={editingLesson?.content ?? ""} key={`content-${editingLesson?._id ?? section._id}`} maxLength={500000} name="content" rows={8} /></label>
                <label>المدة بالدقائق<input defaultValue={editingLesson?.durationMinutes ?? 0} key={`duration-${editingLesson?._id ?? section._id}`} min={0} name="durationMinutes" type="number" /></label>
                <label>ترتيب الدرس<input defaultValue={editingLesson?.order ?? sectionLessons.length} key={`order-${editingLesson?._id ?? section._id}`} min={0} name="order" type="number" /></label>
                <label>المصادر الإضافية (مصدر في كل سطر: العنوان | الرابط)<textarea defaultValue={(editingLesson?.resources ?? []).map((resource) => `${resource.title} | ${resource.url}`).join("\n")} key={`resources-${editingLesson?._id ?? section._id}`} name="resources" placeholder="ملف العمل | https://example.com/file.pdf" rows={3} /></label>
                <label className="checkbox-label"><input defaultChecked={editingLesson?.isFree ?? false} key={`free-${editingLesson?._id ?? section._id}`} name="isFree" type="checkbox" /> معاينة مجانية</label>
                <div className="curriculum-actions">
                  <button className="button button-primary" disabled={saving} type="submit">{saving ? "جارٍ الحفظ..." : "حفظ الدرس"}</button>
                  <button className="button button-secondary" onClick={() => { setActiveSection(null); setEditingLesson(null); }} type="button">إلغاء</button>
                </div>
              </form>
            ) : null}
          </section>
        );
      }) : <section className="admin-panel admin-empty"><p>أضف أول قسم للبدء في بناء المنهج.</p></section>}
    </div>
  );
}
