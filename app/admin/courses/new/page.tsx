import Link from "next/link";
import { AdminShell } from "@/components/admin/AdminShell";
import { CourseEditor } from "@/components/admin/CourseEditor";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";

export default async function NewCoursePage() {
  await connectDB();
  const categories = await Category.find({ isActive: true })
    .select("name")
    .sort({ order: 1, name: 1 })
    .lean()
    .exec();

  return (
    <AdminShell
      description="أدخل المعلومات الأساسية، ثم اختر حفظ كمسودة أو نشر الدورة."
      title="إضافة دورة"
    >
      <div className="admin-back-link">
        <Link href="/admin/courses">العودة إلى الدورات</Link>
      </div>
      <CourseEditor
        categories={categories.map((category) => ({
          id: category._id.toString(),
          name: category.name,
        }))}
      />
    </AdminShell>
  );
}
