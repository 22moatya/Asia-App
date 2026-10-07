import Link from "next/link";
import { adminOrderListQuerySchema } from "@/lib/admin-validations";
import { AdminShell } from "@/components/admin/AdminShell";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";

type AdminOrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

const statusLabels = {
  pending: "قيد الانتظار",
  paid: "مدفوع",
  failed: "فشل الدفع",
  cancelled: "ملغي",
  refunded: "مسترد",
} as const;

export default async function AdminOrdersPage({
  searchParams,
}: AdminOrdersPageProps) {
  const rawParams = await searchParams;
  const parsed = adminOrderListQuerySchema.safeParse({
    q: first(rawParams.q),
    status: first(rawParams.status) || undefined,
    page: first(rawParams.page),
    limit: 20,
  });

  if (!parsed.success) {
    return (
      <AdminShell
        description="راجع الطلبات وحالات الدفع التي سجلها النظام."
        title="إدارة الطلبات"
      >
        <section className="admin-panel admin-empty">
          <p>عوامل تصفية الطلبات غير صالحة.</p>
          <Link className="text-link" href="/admin/orders">
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
      { customerName: new RegExp(escaped, "i") },
      { customerEmail: new RegExp(escaped, "i") },
      { transactionId: new RegExp(escaped, "i") },
      { "items.title": new RegExp(escaped, "i") },
    ];
  }
  const total = await Order.countDocuments(filter).exec();
  const totalPages = Math.ceil(total / parsed.data.limit);
  const orders =
    parsed.data.page <= totalPages
      ? await Order.find(filter)
          .select("items total currency status transactionId customerName customerEmail createdAt")
          .sort({ createdAt: -1, _id: -1 })
          .skip((parsed.data.page - 1) * parsed.data.limit)
          .limit(parsed.data.limit)
          .lean()
          .exec()
      : [];
  const paginationParams = new URLSearchParams();
  if (parsed.data.q) paginationParams.set("q", parsed.data.q);
  if (parsed.data.status) paginationParams.set("status", parsed.data.status);
  const paginationPrefix = `/admin/orders?${paginationParams.toString() ? `${paginationParams.toString()}&` : ""}`;

  return (
    <AdminShell
      description="راجع الطلبات وحالات الدفع التي سجلها النظام."
      title="إدارة الطلبات"
    >
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <div>
            <h2>الطلبات</h2>
            <p>
              {total.toLocaleString("ar-EG")} طلب
              {totalPages
                ? ` · صفحة ${parsed.data.page.toLocaleString("ar-EG")} من ${totalPages.toLocaleString("ar-EG")}`
                : ""}
            </p>
          </div>
        </div>
        <form action="/admin/orders" className="admin-search-form" method="get">
          <label htmlFor="admin-order-search">ابحث في الطلبات</label>
          <input
            defaultValue={parsed.data.q}
            id="admin-order-search"
            maxLength={100}
            name="q"
            placeholder="اسم الطالب أو البريد أو رقم المعاملة"
            type="search"
          />
          <select
            aria-label="تصفية حسب حالة الطلب"
            defaultValue={parsed.data.status ?? ""}
            name="status"
          >
            <option value="">كل الحالات</option>
            {Object.entries(statusLabels).map(([status, label]) => (
              <option key={status} value={status}>
                {label}
              </option>
            ))}
          </select>
          <input name="page" type="hidden" value="1" />
          <button className="button button-secondary" type="submit">
            بحث
          </button>
        </form>
        {orders.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">رقم الطلب</th>
                  <th scope="col">الطالب</th>
                  <th scope="col">الدورات</th>
                  <th scope="col">المبلغ</th>
                  <th scope="col">حالة الدفع</th>
                  <th scope="col">رقم المعاملة</th>
                  <th scope="col">التاريخ</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id.toString()}>
                    <td>
                      <code>{order._id.toString().slice(-8)}</code>
                    </td>
                    <td>
                      {order.customerName}
                      <small className="table-subtitle">
                        {order.customerEmail}
                      </small>
                    </td>
                    <td>{order.items.map((item) => item.title).join("، ")}</td>
                    <td>
                      {new Intl.NumberFormat("ar-EG", {
                        style: "currency",
                        currency: order.currency,
                        maximumFractionDigits: 0,
                      }).format(order.total)}
                    </td>
                    <td>
                      <span className={`status-badge status-${order.status}`}>
                        {statusLabels[order.status]}
                      </span>
                    </td>
                    <td>{order.transactionId || "—"}</td>
                    <td>
                      {new Intl.DateTimeFormat("ar-EG", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      }).format(order.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty">
            <h2>
              {total
                ? "لا توجد طلبات تطابق عوامل التصفية."
                : "لا توجد طلبات حتى الآن."}
            </h2>
            <p>
              ستظهر الطلبات هنا بعد تفعيل إنشاء الطلبات وتأكيد الدفع من الخادم.
            </p>
          </div>
        )}
        {totalPages > 1 ? (
          <nav aria-label="صفحات الطلبات" className="pagination">
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
