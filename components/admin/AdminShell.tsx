import Link from "next/link";
import { SignOutButton } from "@/components/auth/SignOutButton";

const navigation = [
  { href: "/admin", label: "لوحة التحكم" },
  { href: "/admin/courses", label: "الدورات" },
  { href: "/admin/categories", label: "التصنيفات" },
  { href: "/admin/students", label: "الطلاب" },
  { href: "/admin/orders", label: "الطلبات" },
];

export function AdminShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="admin-shell">
      <aside aria-label="قائمة الإدارة" className="admin-sidebar">
        <Link className="admin-brand" href="/admin">
          <span aria-hidden="true" className="admin-brand-mark">
            ع
          </span>
          <span>
            <strong>مساحة الإدارة</strong>
            <small>إدارة المنصة التعليمية</small>
          </span>
        </Link>
        <nav className="admin-nav">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
          <Link href="/courses">زيارة الموقع</Link>
        </nav>
        <div className="admin-sidebar-footer">
          <SignOutButton />
        </div>
      </aside>
      <section className="admin-main">
        <header className="admin-page-header">
          <div>
            <span className="eyebrow">إدارة المنصة</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </header>
        {children}
      </section>
    </main>
  );
}
