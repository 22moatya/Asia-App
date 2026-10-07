import Link from "next/link";
import { getServerSession } from "next-auth";
import { CourseCard } from "@/components/courses/CourseCard";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { authOptions } from "@/lib/auth-options";
import {
  getActiveCategories,
  getFeaturedCourses,
  type CourseCardData,
} from "@/lib/course-catalog";

export default async function Home() {
  const session = await getServerSession(authOptions);
  let categories: Awaited<ReturnType<typeof getActiveCategories>> = [];
  let featuredCourses: CourseCardData[] = [];
  let catalogError = false;

  try {
    [categories, featuredCourses] = await Promise.all([
      getActiveCategories(),
      getFeaturedCourses(),
    ]);
  } catch (error) {
    console.error("Failed to load homepage course catalog.", error);
    catalogError = true;
  }

  return (
    <main className="home-shell">
      <header className="site-nav">
        <Link aria-label="منصة التعلّم - الرئيسية" className="site-brand" href="/">
          <span aria-hidden="true" className="site-brand-mark">
            ع
          </span>
          <strong>منصة التعلّم</strong>
        </Link>
        <nav aria-label="التنقل الرئيسي" className="site-nav-links">
          <Link href="/">الرئيسية</Link>
          <Link href="/courses">الدورات</Link>
          <Link href="/cart">السلة</Link>
          <Link href="#categories">التصنيفات</Link>
        </nav>
        <div className="site-nav-account">
          {session?.user ? (
            <>
              <span className="site-user-name">
                {session.user.name ?? session.user.email}
              </span>
              {session.user.role === "admin" ? (
                <Link className="button button-secondary" href="/admin">
                  لوحة الإدارة
                </Link>
              ) : (
                <Link className="button button-secondary" href="/dashboard">
                  لوحة التعلّم
                </Link>
              )}
              <SignOutButton />
            </>
          ) : (
            <>
              <Link className="site-login-link" href="/login">
                تسجيل الدخول
              </Link>
              <Link className="button button-primary" href="/register">
                إنشاء حساب
              </Link>
            </>
          )}
        </div>
      </header>
      <section className="home-hero">
        <div className="home-hero-copy">
          <span className="eyebrow">معرفة تفتح لك آفاقاً جديدة</span>
          <h1>تعلّم اليوم. واصنع فرصك غداً.</h1>
          <p>
            {session?.user
              ? `مرحباً ${session.user.name ?? "بعودتك"}، تابع استكشاف دورات جديدة تناسب طموحك.`
              : "اكتشف دورات عملية يقدّمها خبراء، وطوّر مهاراتك بخطوات واضحة تناسب أهدافك."}
          </p>
          <div className="actions">
            <Link className="button button-primary" href="/courses">
              استكشف الدورات <span aria-hidden="true">←</span>
            </Link>
            {!session?.user ? (
              <Link className="button button-secondary" href="/register">
                ابدأ التعلّم
              </Link>
            ) : null}
          </div>
          <div className="hero-proof">
            <span>دورات منتقاة</span>
            <span>تعلّم بالوتيرة المناسبة لك</span>
            <span>مهارات قابلة للتطبيق</span>
          </div>
        </div>
        <div aria-hidden="true" className="home-hero-art">
          <div className="hero-art-orbit hero-art-orbit-one" />
          <div className="hero-art-orbit hero-art-orbit-two" />
          <div className="hero-art-card hero-art-card-main">
            <span className="hero-art-icon">✦</span>
            <span className="hero-art-label">خطوة جديدة كل يوم</span>
            <strong>رحلتك تبدأ<br />من هنا</strong>
            <div className="hero-art-progress">
              <span />
            </div>
          </div>
          <div className="hero-art-card hero-art-card-small">
            <span>+ مهارة جديدة</span>
          </div>
        </div>
      </section>
      <section
        aria-labelledby="categories-title"
        className="home-section"
        id="categories"
      >
        <div className="home-section-heading">
          <div>
            <span className="eyebrow">تعلّم ما يهمك</span>
            <h2 id="categories-title">استكشف حسب المجال</h2>
          </div>
          <Link className="text-link" href="/courses">
            كل الدورات <span aria-hidden="true">←</span>
          </Link>
        </div>
        {catalogError ? (
          <p className="home-catalog-notice" role="status">
            تعذّر تحميل التصنيفات الآن. يمكنك تصفح الدورات أو إعادة المحاولة
            لاحقاً.
          </p>
        ) : categories.length ? (
          <div className="home-category-grid">
            {categories.slice(0, 8).map((category, index) => (
              <Link
                className="home-category-card"
                href={`/courses?category=${encodeURIComponent(category.slug)}`}
                key={category.id}
              >
                <span aria-hidden="true" className={`category-icon category-icon-${index % 4}`}>
                  {["✧", "⌘", "◈", "↗"][index % 4]}
                </span>
                <strong>{category.name}</strong>
                <span>اكتشف الدورات <span aria-hidden="true">←</span></span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="home-catalog-notice">
            ستظهر التصنيفات هنا عند إضافتها إلى المنصة.
          </p>
        )}
      </section>
      <section aria-labelledby="featured-title" className="home-section">
        <div className="home-section-heading">
          <div>
            <span className="eyebrow">اختياراتنا لك</span>
            <h2 id="featured-title">دورات مميزة</h2>
          </div>
          <Link className="text-link" href="/courses">
            تصفح المكتبة <span aria-hidden="true">←</span>
          </Link>
        </div>
        {featuredCourses.length ? (
          <div className="course-grid home-featured-grid">
            {featuredCourses.map((course) => (
              <CourseCard course={course} key={course.id} />
            ))}
          </div>
        ) : (
          <p className="home-catalog-notice">
            {catalogError
              ? "تعذّر تحميل الدورات المميزة الآن."
              : "ستظهر الدورات المميزة هنا عند نشرها."}
          </p>
        )}
      </section>
      <footer className="home-footer">
        <Link className="site-brand" href="/">
          <span aria-hidden="true" className="site-brand-mark">
            ع
          </span>
          <strong>منصة التعلّم</strong>
        </Link>
        <span>ابدأ رحلتك نحو مهارة جديدة.</span>
        <Link href="/courses">تصفّح الدورات</Link>
      </footer>
    </main>
  );
}
