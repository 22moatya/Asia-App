import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Course } from "@/models/Course";
import { Order } from "@/models/Order";
import { User } from "@/models/User";

export default async function AdminDashboardPage() {
  await connectDB();
  const [
    students,
    courses,
    publishedCourses,
    activeCategories,
    totalOrders,
    paidOrders,
    pendingPayments,
    revenueResult,
    latestCourses,
  ] = await Promise.all([
      User.countDocuments({ role: "student" }).exec(),
      Course.countDocuments().exec(),
      Course.countDocuments({ status: "published" }).exec(),
      Category.countDocuments({ isActive: true }).exec(),
      Order.countDocuments().exec(),
      Order.countDocuments({ status: "paid" }).exec(),
      Order.countDocuments({ status: "pending" }).exec(),
      Order.aggregate<{ revenue: number }>([
        { $match: { status: "paid" } },
        { $group: { _id: null, revenue: { $sum: "$total" } } },
      ]).exec(),
      Course.find()
        .select("title slug status createdAt")
        .sort({ createdAt: -1, _id: -1 })
        .limit(5)
        .lean()
        .exec(),
  ]);

  const stats = [
    { label: "إجمالي الطلاب", value: students },
    { label: "إجمالي الدورات", value: courses },
    { label: "دورات منشورة", value: publishedCourses },
    { label: "تصنيفات نشطة", value: activeCategories },
    { label: "إجمالي الطلبات", value: totalOrders },
    { label: "طلبات مدفوعة", value: paidOrders },
    { label: "دفعات معلّقة", value: pendingPayments },
    {
        label: "الإيرادات المحصّلة",
        value: new Intl.NumberFormat("ar-EG", {
          style: "currency",
          currency: "EGP",
          maximumFractionDigits: 0,
        }).format(revenueResult[0]?.revenue ?? 0),
    },
  ];

  return (
    <AdminShell
      description="نظرة عامة على الدورات والطلاب وإعدادات المحتوى."
      title="لوحة التحكم"
    >
      <section aria-label="إحصائيات المنصة" className="admin-stat-grid">
        {stats.map((stat) => (
          <article className="admin-stat-card" key={stat.label}>
            <span>{stat.label}</span>
            <strong>{stat.value.toLocaleString("ar-EG")}</strong>
          </article>
        ))}
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>أحدث الدورات</h2>
            <p>آخر الدورات التي أُنشئت أو حُدّثت.</p>
          </div>
          <Link className="button button-primary" href="/admin/courses/new">
            إضافة دورة
          </Link>
        </div>
        {latestCourses.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">الدورة</th>
                  <th scope="col">الحالة</th>
                  <th scope="col">تاريخ الإنشاء</th>
                  <th scope="col">إجراء</th>
                </tr>
              </thead>
              <tbody>
                {latestCourses.map((course) => (
                  <tr key={course._id.toString()}>
                    <td>{course.title}</td>
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
                      {new Intl.DateTimeFormat("ar-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(course.createdAt)}
                    </td>
                    <td>
                      <Link
                        className="text-link"
                        href={`/admin/courses/${course._id.toString()}/edit`}
                      >
                        تعديل
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <p>لم تتم إضافة دورات بعد.</p>
            <Link className="text-link" href="/admin/courses/new">
              ابدأ بإنشاء أول دورة
            </Link>
          </div>
        )}
      </section>
    </AdminShell>
  );
}
