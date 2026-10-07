import { AdminShell } from "@/components/admin/AdminShell";
import { CategoryManager } from "@/components/admin/CategoryManager";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Course } from "@/models/Course";

export default async function AdminCategoriesPage() {
  await connectDB();
  const [categories, counts] = await Promise.all([
    Category.find().sort({ order: 1, name: 1 }).lean().exec(),
    Course.aggregate<{ _id: { toString(): string }; count: number }>([
      { $group: { _id: "$category", count: { $sum: 1 } } },
    ]).exec(),
  ]);
  const countByCategory = new Map(
    counts.map((entry) => [entry._id.toString(), entry.count])
  );

  return (
    <AdminShell
      description="نظّم موضوعات المنصة التي يمكن للطلاب تصفحها."
      title="إدارة التصنيفات"
    >
      <CategoryManager
        categories={categories.map((category) => ({
          id: category._id.toString(),
          name: category.name,
          slug: category.slug,
          description: category.description,
          image: category.image,
          isActive: category.isActive,
          order: category.order,
          courseCount: countByCategory.get(category._id.toString()) ?? 0,
        }))}
      />
    </AdminShell>
  );
}
