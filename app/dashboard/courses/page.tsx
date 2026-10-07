import Link from "next/link";
import { getCurrentUser } from "@/lib/api-auth";
import { getStudentCourses } from "@/lib/learning";

export const metadata = { title: "مقرراتي" };

export default async function StudentCoursesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const courses = await getStudentCourses(user.id);
  return (
    <>
      <header className="dashboard-page-header">
        <span className="eyebrow">مكتبة التعلّم</span>
        <h1>مقرراتي</h1>
        <p>تابع دروسك وتقدمك في الدورات التي التحقت بها.</p>
      </header>
      {courses.length ? (
        <div className="learning-course-grid">
          {courses.map((course) => (
            <article className="learning-course-card" key={course.id}>
              <span className="eyebrow">{course.category?.name ?? "دورة تعليمية"}</span>
              <h2>{course.title}</h2>
              <p>{course.shortDescription}</p>
              <progress max={100} value={course.enrollment.progressPercentage}>
                {course.enrollment.progressPercentage}%
              </progress>
              <small>
                {course.enrollment.completedLessonsCount} من {course.lessonsCount} درس
                · {course.enrollment.progressPercentage}% مكتمل
              </small>
              <Link className="button button-primary" href={`/dashboard/courses/${course.id}`}>
                متابعة الدورة
              </Link>
            </article>
          ))}
        </div>
      ) : (
        <section className="dashboard-empty">
          <p>لا توجد دورات مسجل بها حالياً.</p>
          <Link className="button button-primary" href="/courses">استكشف الدورات</Link>
        </section>
      )}
    </>
  );
}
