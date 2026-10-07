import Link from "next/link";
import type { CourseFilters } from "@/lib/course-catalog";

function pageHref(filters: CourseFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.category) params.set("category", filters.category);
  if (filters.level) params.set("level", filters.level);
  if (filters.rating) params.set("rating", String(filters.rating));
  if (filters.minPrice !== undefined) {
    params.set("minPrice", String(filters.minPrice));
  }
  if (filters.maxPrice !== undefined) {
    params.set("maxPrice", String(filters.maxPrice));
  }
  if (filters.sort !== "latest") params.set("sort", filters.sort);
  params.set("page", String(page));
  return `/courses?${params.toString()}`;
}

export function CoursePagination({
  filters,
  page,
  totalPages,
}: {
  filters: CourseFilters;
  page: number;
  totalPages: number;
}) {
  if (totalPages < 2) return null;

  const first = Math.max(1, Math.min(page - 2, totalPages - 4));
  const pages = Array.from(
    { length: Math.min(5, totalPages) },
    (_, index) => first + index
  );

  return (
    <nav aria-label="صفحات الدورات" className="pagination">
      {page > 1 ? (
        <Link className="page-link" href={pageHref(filters, page - 1)}>
          السابق
        </Link>
      ) : (
        <span aria-disabled="true" className="page-link page-link-disabled">
          السابق
        </span>
      )}
      {pages.map((pageNumber) => (
        <Link
          aria-current={pageNumber === page ? "page" : undefined}
          className={`page-link${pageNumber === page ? " page-link-active" : ""}`}
          href={pageHref(filters, pageNumber)}
          key={pageNumber}
        >
          {pageNumber.toLocaleString("ar-EG")}
        </Link>
      ))}
      {page < totalPages ? (
        <Link className="page-link" href={pageHref(filters, page + 1)}>
          التالي
        </Link>
      ) : (
        <span aria-disabled="true" className="page-link page-link-disabled">
          التالي
        </span>
      )}
    </nav>
  );
}
