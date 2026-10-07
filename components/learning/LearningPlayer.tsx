"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type Lesson = {
  id: string;
  sectionId: string;
  title: string;
  description: string;
  type: "video" | "text" | "pdf" | "file";
  videoUrl: string;
  content: string;
  durationMinutes: number;
  resources: { title: string; url: string }[];
  isFree: boolean;
  isCompleted: boolean;
};

type PlayerData = {
  course: { id: string; title: string; slug: string; instructor: string };
  enrollment: {
    currentLesson: string | null;
    progressPercentage: number;
    completedLessons: string[];
  };
  sections: { id: string; title: string; lessons: Lesson[] }[];
};

export function LearningPlayer({ courseId }: { courseId: string }) {
  const [data, setData] = useState<PlayerData | null>(null);
  const [selectedId, setSelectedId] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const lessons = useMemo(
    () => data?.sections.flatMap((section) => section.lessons) ?? [],
    [data]
  );
  const selectedIndex = lessons.findIndex((lesson) => lesson.id === selectedId);
  const selectedLesson = selectedIndex >= 0 ? lessons[selectedIndex] : null;

  const loadCourse = useCallback(async () => {
    const response = await fetch(`/api/my-courses/${courseId}`, {
      cache: "no-store",
    });
    const result: { success: boolean; message?: string; data?: PlayerData } =
      await response.json();
    if (!response.ok || !result.success || !result.data) {
      throw new Error(result.message || "تعذّر تحميل الدورة.");
    }
    return result.data;
  }, [courseId]);

  useEffect(() => {
    loadCourse()
      .then((course) => {
        setData(course);
        setSelectedId(
          course.enrollment.currentLesson ??
            course.sections.find((section) => section.lessons.length)?.lessons[0]?.id ??
            ""
        );
      })
      .catch((error: unknown) => {
        setMessage(
          error instanceof Error ? error.message : "تعذّر تحميل الدورة."
        );
      })
      .finally(() => setLoading(false));
  }, [loadCourse]);

  async function updateProgress(completed: boolean) {
    if (!selectedLesson) return;
    setMessage("");
    try {
      const response = await fetch(
        `/api/enrollments/${courseId}/progress`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ lessonId: selectedLesson.id, completed }),
        }
      );
      const result: {
        success: boolean;
        message?: string;
        data?: { progressPercentage: number };
      } = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "تعذّر حفظ التقدم.");
      }
      setData((current) => {
        if (!current) return current;
        const completedLessons = new Set(current.enrollment.completedLessons);
        if (completed) completedLessons.add(selectedLesson.id);
        else completedLessons.delete(selectedLesson.id);
        return {
          ...current,
          enrollment: {
            ...current.enrollment,
            currentLesson: selectedLesson.id,
            completedLessons: [...completedLessons],
            progressPercentage: result.data?.progressPercentage ?? 0,
          },
          sections: current.sections.map((section) => ({
            ...section,
            lessons: section.lessons.map((lesson) =>
              lesson.id === selectedLesson.id
                ? { ...lesson, isCompleted: completed }
                : lesson
            ),
          })),
        };
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "تعذّر حفظ التقدم."
      );
    }
  }

  if (loading) {
    return <section className="learning-panel" aria-busy="true">جارٍ تحميل الدورة...</section>;
  }
  if (!data) {
    return (
      <section className="learning-panel" role="alert">
        <p>{message || "تعذّر تحميل الدورة."}</p>
        <Link className="button button-secondary" href="/dashboard">
          العودة إلى لوحة المتعلم
        </Link>
      </section>
    );
  }

  return (
    <main className="learning-player-shell">
      <header className="learning-player-header">
        <div>
          <Link className="text-link" href="/dashboard/courses">
            مقرراتي
          </Link>
          <h1>{data.course.title}</h1>
          <p>المدرّب: {data.course.instructor}</p>
        </div>
        <div className="learning-progress">
          <span>تقدمك: {data.enrollment.progressPercentage}%</span>
          <progress max={100} value={data.enrollment.progressPercentage}>
            {data.enrollment.progressPercentage}%
          </progress>
        </div>
      </header>
      <div className="learning-player-layout">
        <aside aria-label="منهج الدورة" className="learning-sidebar">
          {data.sections.map((section) => (
            <section className="learning-section" key={section.id}>
              <h2>{section.title}</h2>
              <ol>
                {section.lessons.map((lesson) => (
                  <li key={lesson.id}>
                    <button
                      aria-current={lesson.id === selectedId ? "true" : undefined}
                      className={`learning-lesson-link ${lesson.id === selectedId ? "is-active" : ""}`}
                      onClick={() => setSelectedId(lesson.id)}
                      type="button"
                    >
                      <span aria-hidden="true">
                        {lesson.isCompleted ? "✓" : lesson.type === "video" ? "▶" : "•"}
                      </span>
                      <span>{lesson.title}</span>
                      <small>{lesson.durationMinutes} د</small>
                    </button>
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </aside>
        <article className="learning-content">
          {selectedLesson ? (
            <>
              <div className="learning-content-heading">
                <div>
                  <span className="eyebrow">
                    {selectedLesson.type === "video"
                      ? "درس فيديو"
                      : selectedLesson.type === "text"
                        ? "درس نصي"
                        : selectedLesson.type === "pdf"
                          ? "ملف PDF"
                          : "ملف تعليمي"}
                  </span>
                  <h2>{selectedLesson.title}</h2>
                </div>
                <span>{selectedLesson.durationMinutes} دقيقة</span>
              </div>
              {selectedLesson.description ? <p>{selectedLesson.description}</p> : null}
              {selectedLesson.type === "video" && selectedLesson.videoUrl ? (
                <video className="learning-video" controls src={selectedLesson.videoUrl}>
                  متصفحك لا يدعم تشغيل الفيديو.
                </video>
              ) : null}
              {selectedLesson.type === "text" && selectedLesson.content ? (
                <div className="learning-text-content">{selectedLesson.content}</div>
              ) : null}
              {selectedLesson.type === "pdf" && selectedLesson.videoUrl ? (
                <iframe
                  className="learning-document"
                  src={selectedLesson.videoUrl}
                  title={`مستند ${selectedLesson.title}`}
                />
              ) : null}
              {selectedLesson.type === "file" && selectedLesson.videoUrl ? (
                <a
                  className="button button-primary"
                  href={selectedLesson.videoUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  فتح أو تنزيل الملف
                </a>
              ) : null}
              {selectedLesson.resources.length ? (
                <section className="learning-resources">
                  <h3>مصادر إضافية</h3>
                  <ul>
                    {selectedLesson.resources.map((resource) => (
                      <li key={`${resource.title}-${resource.url}`}>
                        <a href={resource.url} rel="noreferrer" target="_blank">
                          {resource.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </section>
              ) : null}
              {message ? <p className="admin-form-error" role="alert">{message}</p> : null}
              <div className="learning-controls">
                <button
                  className="button button-secondary"
                  disabled={selectedIndex <= 0}
                  onClick={() => setSelectedId(lessons[selectedIndex - 1]?.id ?? "")}
                  type="button"
                >
                  الدرس السابق
                </button>
                <button
                  className="button button-primary"
                  onClick={() => updateProgress(!selectedLesson.isCompleted)}
                  type="button"
                >
                  {selectedLesson.isCompleted ? "إلغاء إكمال الدرس" : "إكمال الدرس"}
                </button>
                <button
                  className="button button-secondary"
                  disabled={selectedIndex < 0 || selectedIndex >= lessons.length - 1}
                  onClick={() => setSelectedId(lessons[selectedIndex + 1]?.id ?? "")}
                  type="button"
                >
                  الدرس التالي
                </button>
              </div>
            </>
          ) : (
            <p>لا توجد دروس في هذه الدورة حتى الآن.</p>
          )}
        </article>
      </div>
    </main>
  );
}
