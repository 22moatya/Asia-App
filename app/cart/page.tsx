import type { Metadata } from "next";
import Link from "next/link";
import { CartCheckout } from "@/components/payments/CartCheckout";

export const metadata: Metadata = {
  title: "سلة المشتريات",
};

export default function CartPage() {
  return (
    <main className="catalog-shell">
      <div className="catalog-breadcrumb">
        <Link href="/">الرئيسية</Link>
        <span aria-hidden="true">/</span>
        <span>السلة</span>
      </div>
      <header className="catalog-header">
        <span className="eyebrow">خطوتك التالية</span>
        <h1>سلة المشتريات</h1>
        <p>راجع مقرراتك قبل الانتقال إلى بوابة الدفع الآمنة.</p>
      </header>
      <CartCheckout />
    </main>
  );
}
