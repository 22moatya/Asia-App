"use client";

export default function CoursesError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="catalog-shell">
      <section className="empty-state error-state" role="alert">
        <span aria-hidden="true" className="empty-state-icon">
          !
        </span>
        <h1>تعذّر تحميل الدورات</h1>
        <p>حدثت مشكلة في الاتصال بكتالوج الدورات. حاول مرة أخرى بعد قليل.</p>
        <button
          className="button button-primary"
          onClick={() => reset()}
          type="button"
        >
          إعادة المحاولة
        </button>
      </section>
    </main>
  );
}
