import Link from "next/link";
import { getCurrentUser } from "@/lib/api-auth";
import { getStudentCourses } from "@/lib/learning";

export const metadata = { title: "لوحة المتعلم" };

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const courses = await getStudentCourses(user.id);
  return (
    <>
      <header className="dashboard-page-header">
        <span className="eyebrow">مساحة التعلّم</span>
        <h1>مرحباً، {user.name}</h1>
        <p>تابع مقرراتك وتقدمك من مكان واحد.</p>
      </header>
      <section className="dashboard-panel">
        <div className="dashboard-panel-heading">
          <div>
            <h2>مقرراتي</h2>
            <p>{courses.length.toLocaleString("ar-EG")} دورة مسجل بها</p>
          </div>
          <Link className="text-link" href="/dashboard/courses">عرض الكل</Link>
        </div>
        {courses.length ? (
          <div className="learning-course-grid">
            {courses.slice(0, 3).map((course) => (
              <article className="learning-course-card" key={course.id}>
                <span className="eyebrow">{course.category?.name ?? "دورة تعليمية"}</span>
                <h3>{course.title}</h3>
                <p>{course.shortDescription}</p>
                <progress max={100} value={course.enrollment.progressPercentage}>
                  {course.enrollment.progressPercentage}%
                </progress>
                <small>{course.enrollment.progressPercentage}% مكتمل</small>
                <Link
                  className="button button-primary"
                  href={`/dashboard/courses/${course.id}`}
                >
                  متابعة التعلّم
                </Link>
              </article>
            ))}
          </div>
        ) : (
          <div className="dashboard-empty">
            <p>لم تلتحق بأي دورة بعد.</p>
            <Link className="button button-primary" href="/courses">اكتشف الدورات</Link>
          </div>
        )}
      </section>
      <section className="dashboard-panel profile-panel">
        <h2>ملفي الشخصي</h2>
        <dl>
          <div><dt>الاسم</dt><dd>{user.name}</dd></div>
          <div><dt>البريد الإلكتروني</dt><dd>{user.email}</dd></div>
        </dl>
      </section>
    </>
  );
}
