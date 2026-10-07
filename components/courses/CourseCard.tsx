import Image from "next/image";
import Link from "next/link";
import type { CourseCardData } from "@/lib/course-catalog";

const levelLabels = {
  beginner: "مبتدئ",
  intermediate: "متوسط",
  advanced: "متقدم",
} as const;

const egp = new Intl.NumberFormat("ar-EG", {
  style: "currency",
  currency: "EGP",
  maximumFractionDigits: 0,
});

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (!hours) return `${remainingMinutes} دقيقة`;
  return remainingMinutes ? `${hours} س ${remainingMinutes} د` : `${hours} ساعة`;
}

export function CourseCard({ course }: { course: CourseCardData }) {
  const discount =
    course.originalPrice > course.price && course.originalPrice > 0
      ? Math.round(
          ((course.originalPrice - course.price) / course.originalPrice) * 100
        )
      : 0;

  return (
    <article className="course-card">
      <Link
        aria-label={`عرض دورة ${course.title}`}
        className="course-card-image"
        href={`/courses/${course.slug}`}
      >
        {course.thumbnail ? (
          <Image
            alt=""
            className="course-thumbnail"
            height={420}
            src={course.thumbnail}
            unoptimized
            width={720}
          />
        ) : (
          <span aria-hidden="true" className="course-image-placeholder">
            <span>مساحة للتعلّم</span>
            <strong>{course.category?.name ?? "دورة تعليمية"}</strong>
          </span>
        )}
        {discount ? <span className="course-discount">خصم {discount}%</span> : null}
      </Link>
      <div className="course-card-content">
        <div className="course-card-meta">
          <Link
            className="category-link"
            href={
              course.category
                ? `/courses?category=${encodeURIComponent(course.category.slug)}`
                : "/courses"
            }
          >
            {course.category?.name ?? "دورة"}
          </Link>
          <span>{levelLabels[course.level]}</span>
        </div>
        <h2>
          <Link href={`/courses/${course.slug}`}>{course.title}</Link>
        </h2>
        <p className="course-instructor">مع {course.instructor}</p>
        <p className="course-summary">{course.shortDescription}</p>
        <div aria-label={`التقييم ${course.rating} من 5`} className="course-rating">
          <span aria-hidden="true">★</span>
          <strong>{course.rating ? course.rating.toFixed(1) : "جديد"}</strong>
          <span>({course.reviewsCount.toLocaleString("ar-EG")} تقييم)</span>
        </div>
        <div className="course-facts">
          <span>{course.lessonsCount.toLocaleString("ar-EG")} درس</span>
          {course.durationMinutes > 0 ? (
            <span>{formatDuration(course.durationMinutes)}</span>
          ) : null}
          <span>{course.studentsCount.toLocaleString("ar-EG")} طالب</span>
        </div>
        <div className="course-card-footer">
          <div className="course-price">
            <strong>{course.price === 0 ? "مجانية" : egp.format(course.price)}</strong>
            {course.originalPrice > course.price ? (
              <del>{egp.format(course.originalPrice)}</del>
            ) : null}
          </div>
          <Link className="text-link" href={`/courses/${course.slug}`}>
            تفاصيل الدورة <span aria-hidden="true">←</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
