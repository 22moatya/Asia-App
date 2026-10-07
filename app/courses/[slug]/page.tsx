import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublishedCourseBySlug } from "@/lib/course-catalog";
import { getPublicCourseCurriculum } from "@/lib/learning";
import { FreeEnrollmentButton } from "@/components/learning/FreeEnrollmentButton";
import { AddCourseToCartButton } from "@/components/payments/AddCourseToCartButton";

const egp = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

const levelLabels = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
} as const;

type CoursePageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: CoursePageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const course = await getPublishedCourseBySlug(slug);
    if (!course) {
      return { title: "الدورة غير موجودة" };
    }

    return {
      title: course.title,
      description: course.shortDescription,
      keywords: course.tags,
      openGraph: {
        title: course.title,
        description: course.shortDescription,
        type: "website",
        ...(course.thumbnail && { images: [course.thumbnail] }),
      },
      twitter: {
        card: course.thumbnail ? "summary_large_image" : "summary",
        title: course.title,
        description: course.shortDescription,
        ...(course.thumbnail && { images: [course.thumbnail] }),
      },
    };
  } catch (error) {
    console.error("Failed to create course metadata.", error);
    return { title: "الدورة" };
  }
}

export default async function CourseDetailsPage({ params }: CoursePageProps) {
  const { slug } = await params;
  const [course, curriculum] = await Promise.all([
    getPublishedCourseBySlug(slug),
    getPublicCourseCurriculum(slug),
  ]);
  if (!course) {
    notFound();
  }

  const discount =
    course.originalPrice > course.price && course.originalPrice > 0
      ? Math.round(
          ((course.originalPrice - course.price) / course.originalPrice) * 100
        )
      : 0;

  return (
    <main className="catalog-shell course-detail-shell">
      <div className="catalog-breadcrumb">
        <Link href="/">الرئيسية</Link>
        <span aria-hidden="true">/</span>
        <Link href="/courses">الدورات</Link>
        {course.category ? (
          <>
            <span aria-hidden="true">/</span>
            <Link
              href={`/courses?category=${encodeURIComponent(course.category.slug)}`}
            >
              {course.category.name}
            </Link>
          </>
        ) : null}
      </div>
      <article>
        <header className="course-detail-hero">
          <div className="course-detail-copy">
            <div className="course-card-meta">
              {course.category ? (
                <Link
                  className="category-link"
                  href={`/courses?category=${encodeURIComponent(course.category.slug)}`}
                >
                  {course.category.name}
                </Link>
              ) : null}
              <span>{levelLabels[course.level]}</span>
              <span>{course.language}</span>
            </div>
            <h1>{course.title}</h1>
            <p className="course-detail-description">
              {course.shortDescription}
            </p>
            <p className="course-instructor">
              يقدّمها <strong>{course.instructor}</strong>
            </p>
            <div
              aria-label={`التقييم ${course.rating} من 5`}
              className="course-rating"
            >
              <span aria-hidden="true">★</span>
              <strong>{course.rating ? course.rating.toFixed(1) : "جديد"}</strong>
              <span>
                ({course.reviewsCount.toLocaleString("ar-EG")} تقييم)
              </span>
              <span>
                {course.studentsCount.toLocaleString("ar-EG")} طالب
              </span>
            </div>
            <p className="course-updated">
              آخر تحديث:{" "}
              {new Intl.DateTimeFormat("ar-EG", {
                year: "numeric",
                month: "long",
              }).format(new Date(course.updatedAt))}
            </p>
          </div>
          <div className="course-detail-media">
            {course.thumbnail ? (
              <Image
                alt={`غلاف دورة ${course.title}`}
                className="course-detail-image"
                height={600}
                priority
                src={course.thumbnail}
                unoptimized
                width={1000}
              />
            ) : (
              <div aria-hidden="true" className="course-detail-placeholder">
                {course.category?.name ?? "دورة تعليمية"}
              </div>
            )}
            <div className="course-purchase-card">
              <div className="course-price course-price-large">
                <strong>
                  {course.price === 0 ? "مجانية" : egp.format(course.price)}
                </strong>
                {course.originalPrice > course.price ? (
                  <del>{egp.format(course.originalPrice)}</del>
                ) : null}
                {discount ? (
                  <span className="course-discount-label">
                    خصم {discount}%
                  </span>
                ) : null}
              </div>
              {course.price === 0 ? (
                <FreeEnrollmentButton courseId={course.id} />
              ) : (
                <>
                  <AddCourseToCartButton courseId={course.id} />
                  <p>تُفعّل الدورة بعد تأكيد الدفع من الخادم.</p>
                </>
              )}
              <ul className="course-purchase-facts">
                <li>{course.lessonsCount.toLocaleString("ar-EG")} درس</li>
                <li>{course.language}</li>
                <li>المستوى: {levelLabels[course.level]}</li>
              </ul>
            </div>
          </div>
        </header>
        <div className="course-detail-content">
          <section className="course-content-section">
            <h2>عن هذه الدورة</h2>
            <p className="course-long-description">{course.description}</p>
          </section>
          {course.learningOutcomes.length ? (
            <section className="course-content-section">
              <h2>ماذا ستتعلّم؟</h2>
              <ul className="outcome-list">
                {course.learningOutcomes.map((outcome) => (
                  <li key={outcome}>
                    <span aria-hidden="true">✓</span>
                    {outcome}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {course.requirements.length ? (
            <section className="course-content-section">
              <h2>المتطلبات</h2>
              <ul className="requirement-list">
                {course.requirements.map((requirement) => (
                  <li key={requirement}>{requirement}</li>
                ))}
              </ul>
            </section>
          ) : null}
          {course.tags.length ? (
            <section
              aria-label="المواضيع"
              className="course-tag-list course-content-section"
            >
              {course.tags.map((tag) => (
                <span key={tag}>{tag}</span>
              ))}
            </section>
          ) : null}
          {curriculum?.sections.length ? (
            <section className="course-content-section public-curriculum">
              <h2>محتوى الدورة</h2>
              <div className="public-curriculum-sections">
                {curriculum.sections.map((section) => (
                  <details key={section.id}>
                    <summary>
                      <strong>{section.title}</strong>
                      <span>{section.lessons.length.toLocaleString("ar-EG")} درس</span>
                    </summary>
                    {section.description ? <p>{section.description}</p> : null}
                    <ol>
                      {section.lessons.map((lesson) => (
                        <li key={lesson.id}>
                          <span>{lesson.title}</span>
                          <small>
                            {lesson.durationMinutes.toLocaleString("ar-EG")} د
                            {lesson.isFree ? " · معاينة مجانية" : ""}
                          </small>
                        </li>
                      ))}
                    </ol>
                  </details>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </article>
    </main>
  );
}
