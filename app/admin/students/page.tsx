import Link from "next/link";
import { adminStudentListQuerySchema } from "@/lib/admin-validations";
import { AdminShell } from "@/components/admin/AdminShell";
import { StudentStatusButton } from "@/components/admin/StudentStatusButton";
import { connectDB } from "@/lib/mongodb";
import { User } from "@/models/User";

type StudentPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminStudentsPage({
  searchParams,
}: StudentPageProps) {
  const params = await searchParams;
  const query = Array.isArray(params.q) ? params.q[0] : params.q;
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const isActive = Array.isArray(params.isActive)
    ? params.isActive[0]
    : params.isActive;
  const parsed = adminStudentListQuerySchema.safeParse({
    q: query,
    page: pageValue,
    isActive: isActive || undefined,
    limit: 20,
  });
  if (!parsed.success) {
    return (
      <AdminShell
        description="اعرض حسابات الطلاب وأوقف الحسابات عند الحاجة."
        title="إدارة الطلاب"
      >
        <section className="admin-panel admin-empty">
          <p>عوامل تصفية الطلاب غير صالحة.</p>
          <Link className="text-link" href="/admin/students">
            مسح عوامل التصفية
          </Link>
        </section>
      </AdminShell>
    );
  }
  const page = parsed.data.page;
  const limit = 20;

  await connectDB();
  const filter: Record<string, unknown> = { role: "student" };
  if (parsed.data.isActive !== undefined) {
    filter.isActive = parsed.data.isActive;
  }
  if (parsed.data.q) {
    const escaped = parsed.data.q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { name: new RegExp(escaped, "i") },
      { email: new RegExp(escaped, "i") },
    ];
  }
  const total = await User.countDocuments(filter).exec();
  const totalPages = Math.ceil(total / limit);
  const students =
    totalPages && page <= totalPages
      ? await User.find(filter)
          .select("name email isActive createdAt")
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * limit)
          .limit(limit)
          .lean()
          .exec()
      : [];

  const paginationParams = new URLSearchParams();
  if (parsed.data.q) paginationParams.set("q", parsed.data.q);
  if (isActive) paginationParams.set("isActive", isActive);
  const searchQuery = `/admin/students?${paginationParams.toString() ? `${paginationParams.toString()}&` : ""}`;

  return (
    <AdminShell
      description="اعرض حسابات الطلاب وأوقف الحسابات عند الحاجة."
      title="إدارة الطلاب"
    >
      <section className="admin-panel">
        <form action="/admin/students" className="admin-search-form" method="get">
          <label htmlFor="student-search">ابحث بالاسم أو البريد</label>
          <input
            defaultValue={parsed.data.q}
            id="student-search"
            maxLength={100}
            name="q"
            placeholder="اكتب اسم الطالب أو بريده الإلكتروني"
            type="search"
          />
          <select
            aria-label="تصفية حسب حالة الحساب"
            defaultValue={isActive ?? ""}
            name="isActive"
          >
            <option value="">كل الحالات</option>
            <option value="true">نشط</option>
            <option value="false">معطّل</option>
          </select>
          <input name="page" type="hidden" value="1" />
          <button className="button button-primary" type="submit">
            بحث
          </button>
        </form>
        <div className="admin-panel-heading">
          <div>
            <h2>الطلاب</h2>
            <p>
              {total.toLocaleString("ar-EG")} حساب
              {totalPages
                ? ` · صفحة ${page.toLocaleString("ar-EG")} من ${totalPages.toLocaleString("ar-EG")}`
                : ""}
            </p>
          </div>
        </div>
        {students.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">الطالب</th>
                  <th scope="col">البريد الإلكتروني</th>
                  <th scope="col">تاريخ التسجيل</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student._id.toString()}>
                    <td>{student.name}</td>
                    <td>{student.email}</td>
                    <td>
                      {new Intl.DateTimeFormat("ar-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(student.createdAt)}
                    </td>
                    <td>
                      <span
                        className={`status-badge ${student.isActive ? "status-active" : "status-inactive"}`}
                      >
                        {student.isActive ? "نشط" : "معطّل"}
                      </span>
                    </td>
                    <td>
                      <StudentStatusButton
                        id={student._id.toString()}
                        isActive={student.isActive}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <p>
              {parsed.data.q
                ? "لم يتم العثور على طلاب يطابقون عوامل التصفية."
                : "لا يوجد طلاب بعد."}
            </p>
          </div>
        )}
        {totalPages > 1 ? (
          <nav aria-label="صفحات الطلاب" className="pagination">
            {page > 1 ? (
              <Link className="page-link" href={`${searchQuery}page=${page - 1}`}>
                السابق
              </Link>
            ) : null}
            <span className="page-link page-link-active">
              {page.toLocaleString("ar-EG")}
            </span>
            {page < totalPages ? (
              <Link className="page-link" href={`${searchQuery}page=${page + 1}`}>
                التالي
              </Link>
            ) : null}
          </nav>
        ) : null}
      </section>
    </AdminShell>
  );
}
