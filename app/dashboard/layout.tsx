import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getCurrentUser } from "@/lib/api-auth";

const navigation = [
  { href: "/dashboard", label: "نظرة عامة" },
  { href: "/dashboard/courses", label: "مقرراتي" },
  { href: "/dashboard/orders", label: "طلباتي" },
];

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");

  return (
    <main className="dashboard-shell">
      <aside aria-label="لوحة المتعلم" className="dashboard-sidebar">
        <Link className="admin-brand" href="/dashboard">
          <span aria-hidden="true" className="admin-brand-mark">ت</span>
          <span>
            <strong>مساحة التعلّم</strong>
            <small>{user.name}</small>
          </span>
        </Link>
        <nav className="admin-nav">
          {navigation.map((item) => (
            <Link href={item.href} key={item.href}>{item.label}</Link>
          ))}
          <Link href="/courses">استكشف الدورات</Link>
        </nav>
        <div className="admin-sidebar-footer"><SignOutButton /></div>
      </aside>
      <section className="dashboard-main">{children}</section>
    </main>
  );
}
