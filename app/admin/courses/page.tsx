import Link from "next/link";
import { adminCourseListQuerySchema } from "@/lib/admin-validations";
import { AdminShell } from "@/components/admin/AdminShell";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";

type AdminCoursesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminCoursesPage({
  searchParams,
}: AdminCoursesPageProps) {
  const rawParams = await searchParams;
  const parsed = adminCourseListQuerySchema.safeParse({
    q: first(rawParams.q),
    status: first(rawParams.status) || undefined,
    page: first(rawParams.page),
    limit: 20,
  });
  if (!parsed.success) {
    return (
      <AdminShell
        description="أنشئ الدورات وعدّل محتواها وحالة نشرها."
        title="إدارة الدورات"
      >
        <section className="admin-panel admin-empty">
          <p>عوامل تصفية الدورات غير صالحة.</p>
          <Link className="text-link" href="/admin/courses">
            مسح عوامل التصفية
          </Link>
        </section>
      </AdminShell>
    );
  }

  await connectDB();
  const filter: Record<string, unknown> = {};
  if (parsed.data.status) filter.status = parsed.data.status;
  if (parsed.data.q) {
    const escaped = parsed.data.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: new RegExp(escaped, "i") },
      { instructor: new RegExp(escaped, "i") },
      { slug: new RegExp(escaped, "i") },
    ];
  }
  const total = await Course.countDocuments(filter).exec();
  const totalPages = Math.ceil(total / parsed.data.limit);
  const courses =
    parsed.data.page <= totalPages
      ? await Course.find(filter)
          .select("title slug category instructor price status studentsCount createdAt")
          .populate("category", "name")
          .sort({ createdAt: -1, _id: -1 })
          .skip((parsed.data.page - 1) * parsed.data.limit)
          .limit(parsed.data.limit)
          .lean()
          .exec()
      : [];
  const paginationParams = new URLSearchParams();
  if (parsed.data.q) paginationParams.set("q", parsed.data.q);
  if (parsed.data.status) paginationParams.set("status", parsed.data.status);
  const paginationPrefix = `/admin/courses?${paginationParams.toString() ? `${paginationParams.toString()}&` : ""}`;

  return (
    <AdminShell
      description="أنشئ الدورات وعدّل محتواها وحالة نشرها."
      title="إدارة الدورات"
    >
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>الدورات</h2>
            <p>
              {total.toLocaleString("ar-EG")} دورة
              {totalPages
                ? ` · صفحة ${parsed.data.page.toLocaleString("ar-EG")} من ${totalPages.toLocaleString("ar-EG")}`
                : ""}
            </p>
          </div>
          <Link className="button button-primary" href="/admin/courses/new">
            إضافة دورة
          </Link>
        </div>
        <form action="/admin/courses" className="admin-search-form" method="get">
          <label htmlFor="admin-course-search">ابحث عن دورة</label>
          <input
            defaultValue={parsed.data.q}
            id="admin-course-search"
            maxLength={100}
            name="q"
            placeholder="العنوان أو المدرّب أو الرابط"
            type="search"
          />
          <select
            aria-label="تصفية حسب الحالة"
            defaultValue={parsed.data.status ?? ""}
            name="status"
          >
            <option value="">كل الحالات</option>
            <option value="draft">مسودة</option>
            <option value="published">منشورة</option>
            <option value="archived">مؤرشفة</option>
          </select>
          <input name="page" type="hidden" value="1" />
          <button className="button button-secondary" type="submit">
            بحث
          </button>
        </form>
        {courses.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">الدورة</th>
                  <th scope="col">التصنيف</th>
                  <th scope="col">المدرّب</th>
                  <th scope="col">السعر</th>
                  <th scope="col">الطلاب</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course) => (
                  <tr key={course._id.toString()}>
                    <td>
                      <strong>{course.title}</strong>
                      <small className="table-subtitle">{course.slug}</small>
                    </td>
                    <td>
                      {course.category &&
                      typeof course.category === "object" &&
                      "name" in course.category
                        ? String(course.category.name)
                        : "—"}
                    </td>
                    <td>{course.instructor}</td>
                    <td>{course.price.toLocaleString("ar-EG")} ج.م.</td>
                    <td>{course.studentsCount.toLocaleString("ar-EG")}</td>
                    <td>
                      <span className={`status-badge status-${course.status}`}>
                        {course.status === "published"
                          ? "منشورة"
                          : course.status === "archived"
                            ? "مؤرشفة"
                            : "مسودة"}
                      </span>
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={`/admin/courses/${course._id.toString()}/edit`}
                      >
                        تعديل
                      </Link>
                      <Link
                        className="text-link curriculum-table-link"
                        href={`/admin/courses/${course._id.toString()}/curriculum`}
                      >
                        المنهج
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <p>لا توجد دورات في المنصة بعد.</p>
            <Link className="button button-secondary" href="/admin/courses/new">
              إنشاء أول دورة
            </Link>
          </div>
        )}
        {totalPages > 1 ? (
          <nav aria-label="صفحات الدورات" className="pagination">
            {parsed.data.page > 1 ? (
              <Link
                className="page-link"
                href={`${paginationPrefix}page=${parsed.data.page - 1}`}
              >
                السابق
              </Link>
            ) : null}
            <span className="page-link page-link-active">
              {parsed.data.page.toLocaleString("ar-EG")}
            </span>
            {parsed.data.page < totalPages ? (
              <Link
                className="page-link"
                href={`${paginationPrefix}page=${parsed.data.page + 1}`}
              >
                التالي
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </AdminShell>
  );
}
