import Link from "next/link";
import mongoose from "mongoose";
import { notFound } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";
import { CourseEditor } from "@/components/admin/CourseEditor";
import { connectDB } from "@/lib/mongodb";
import { Category } from "@/models/Category";
import { Course } from "@/models/Course";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) notFound();

  await connectDB();
  const [course, categories] = await Promise.all([
    Course.findById(id).lean().exec(),
    Category.find({ isActive: true })
      .select("name")
      .sort({ order: 1, name: 1 })
      .lean()
      .exec(),
  ]);
  if (!course) notFound();

  return (
    <AdminShell
      description={`تعديل: ${course.title}`}
      title="تعديل الدورة"
    >
      <div className="admin-back-link">
        <Link href="/admin/courses">العودة إلى الدورات</Link>
      </div>
      <CourseEditor
        categories={categories.map((category) => ({
          id: category._id.toString(),
          name: category.name,
        }))}
        course={{
          id: course._id.toString(),
          title: course.title,
          slug: course.slug,
          shortDescription: course.shortDescription,
          description: course.description,
          thumbnail: course.thumbnail,
          category: course.category.toString(),
          instructor: course.instructor,
          price: course.price,
          originalPrice: course.originalPrice,
          level: course.level,
          language: course.language,
          durationMinutes: course.durationMinutes,
          lessonsCount: course.lessonsCount,
          requirements: course.requirements,
          learningOutcomes: course.learningOutcomes,
          tags: course.tags,
          featured: course.featured,
          status: course.status,
        }}
      />
    </AdminShell>
  );
}
