import Link from "next/link";
import { getCurrentUser } from "@/lib/api-auth";
import { connectDB } from "@/lib/mongodb";
import { Order } from "@/models/Order";

export const metadata = { title: "طلباتي" };

const statusLabels = {
  pending: "قيد الانتظار",
  paid: "مدفوع",
  failed: "تعذّر الدفع",
  cancelled: "ملغي",
  refunded: "مسترد",
} as const;

export default async function StudentOrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  await connectDB();
  const orders = await Order.find({ user: user.id })
    .select("items total currency status createdAt")
    .sort({ createdAt: -1, _id: -1 })
    .limit(50)
    .lean()
    .exec();

  return (
    <>
      <header className="dashboard-page-header">
        <span className="eyebrow">الحساب</span>
        <h1>طلباتي</h1>
        <p>سجل الطلبات المرتبطة بحسابك فقط.</p>
      </header>
      <section className="dashboard-panel">
        {orders.length ? (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead><tr><th>رقم الطلب</th><th>الدورات</th><th>التاريخ</th><th>الإجمالي</th><th>الحالة</th></tr></thead>
              <tbody>
                {orders.map((order) => (
                  <tr key={order._id.toString()}>
                    <td>{order._id.toString().slice(-8)}</td>
                    <td>{order.items.map((item) => item.title).join("، ")}</td>
                    <td>{new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium" }).format(order.createdAt)}</td>
                    <td>{new Intl.NumberFormat("ar-EG", { style: "currency", currency: order.currency }).format(order.total)}</td>
                    <td><span className={`status-badge status-${order.status}`}>{statusLabels[order.status]}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="dashboard-empty">
            <p>لا توجد طلبات مرتبطة بحسابك.</p>
            <Link className="button button-secondary" href="/courses">استكشف الدورات</Link>
          </div>
        )}
      </section>
    </>
  );
}
