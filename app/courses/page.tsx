import Link from "next/link";
import type { Metadata } from "next";
import { CourseCard } from "@/components/courses/CourseCard";
import { CoursePagination } from "@/components/courses/CoursePagination";
import { CourseSearchForm } from "@/components/courses/CourseSearchForm";
import {
  getActiveCategories,
  listPublishedCourses,
  parseCourseFilters,
} from "@/lib/course-catalog";

export const metadata: Metadata = {
  title: "الدورات",
  description: "اكتشف دورات عملية تساعدك على تطوير مهاراتك.",
};

type CoursesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function CoursesPage({
  searchParams,
}: CoursesPageProps) {
  const rawParams = await searchParams;
  const parsed = parseCourseFilters(rawParams);
  if (!parsed.success) {
    return (
      <main className="catalog-shell">
        <div className="catalog-breadcrumb">
          <Link href="/">الرئيسية</Link>
          <span aria-hidden="true">/</span>
          <span>الدورات</span>
        </div>
        <section className="empty-state error-state" role="alert">
          <h1>تعذّر تطبيق البحث</h1>
          <p>راجع نطاق السعر والتصفية، ثم أرسل البحث مجدداً.</p>
          <Link className="button button-secondary" href="/courses">
            مسح عوامل التصفية
          </Link>
        </section>
      </main>
    );
  }

  const filters = parsed.data;
  const [{ courses, pagination }, categories] = await Promise.all([
    listPublishedCourses(filters),
    getActiveCategories(),
  ]);

  return (
    <main className="catalog-shell">
      <div className="catalog-breadcrumb">
        <Link href="/">الرئيسية</Link>
        <span aria-hidden="true">/</span>
        <span>الدورات</span>
      </div>
      <header className="catalog-header">
        <span className="eyebrow">مكتبة التعلّم</span>
        <h1>اكتشف دورتك القادمة</h1>
        <p>
          تعلّم مهارات جديدة مع دورات عملية يقدّمها خبراء في مجالاتهم.
        </p>
      </header>
      <div className="catalog-layout">
        <aside aria-label="عوامل تصفية الدورات" className="catalog-sidebar">
          <div className="filter-heading">
            <h2>ابحث وصفِّ</h2>
            <Link href="/courses">مسح الكل</Link>
          </div>
          <CourseSearchForm categories={categories} filters={filters} />
        </aside>
        <section aria-labelledby="course-results-title" className="course-results">
          <div className="results-heading">
            <div>
              <h2 id="course-results-title">
                {filters.category
                  ? categories.find(
                      (category) => category.slug === filters.category
                    )?.name ?? "نتائج البحث"
                  : filters.q
                    ? `نتائج البحث عن «${filters.q}»`
                    : "جميع الدورات"}
              </h2>
              <p>
                {pagination.total.toLocaleString("ar-EG")} دورة متاحة
                {pagination.totalPages > 0
                  ? ` · صفحة ${pagination.page.toLocaleString("ar-EG")} من ${pagination.totalPages.toLocaleString("ar-EG")}`
                  : ""}
              </p>
            </div>
          </div>
          {courses.length ? (
            <>
              <div className="course-grid">
                {courses.map((course) => (
                  <CourseCard course={course} key={course.id} />
                ))}
              </div>
              <CoursePagination
                filters={filters}
                page={pagination.page}
                totalPages={pagination.totalPages}
              />
            </>
          ) : (
            <section className="empty-state">
              <span aria-hidden="true" className="empty-state-icon">
                ◇
              </span>
              <h3>لا توجد دورات تطابق بحثك</h3>
              <p>جرّب تغيير كلمات البحث أو توسيع عوامل التصفية.</p>
              <Link className="button button-secondary" href="/courses">
                عرض كل الدورات
              </Link>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}
