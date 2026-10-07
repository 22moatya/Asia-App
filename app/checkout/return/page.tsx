import type { Metadata } from "next";
import Link from "next/link";
import { PaymentReturnStatus } from "@/components/payments/PaymentReturnStatus";

export const metadata: Metadata = {
  title: "حالة الدفع",
  robots: { index: false, follow: false },
};

type CheckoutReturnProps = {
  searchParams: Promise<{ orderId?: string | string[] }>;
};

export default async function CheckoutReturnPage({
  searchParams,
}: CheckoutReturnProps) {
  const params = await searchParams;
  const orderId = Array.isArray(params.orderId)
    ? params.orderId[0]
    : params.orderId;
  return (
    <main className="catalog-shell checkout-return-shell">
      {orderId && /^[a-f\d]{24}$/i.test(orderId) ? (
        <PaymentReturnStatus orderId={orderId} />
      ) : (
        <section className="dashboard-panel dashboard-empty">
          <p>رابط العودة لا يحتوي على رقم طلب صالح.</p>
          <Link className="button button-secondary" href="/dashboard/orders">عرض طلباتي</Link>
        </section>
      )}
    </main>
  );
}
