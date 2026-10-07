import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseCurriculumEditor } from "@/components/admin/CourseCurriculumEditor";
import { AdminShell } from "@/components/admin/AdminShell";
import { connectDB } from "@/lib/mongodb";
import { Course } from "@/models/Course";

type CurriculumPageProps = { params: Promise<{ id: string }> };

export default async function AdminCourseCurriculumPage({
  params,
}: CurriculumPageProps) {
  const { id } = await params;
  await connectDB();
  const course = await Course.findById(id).select("title").lean().exec();
  if (!course) notFound();
  return (
    <AdminShell
      description={`إدارة أقسام ودروس دورة «${course.title}».`}
      title="منهج الدورة"
    >
      <div className="curriculum-page-actions">
        <Link className="text-link" href={`/admin/courses/${id}/edit`}>العودة إلى تعديل الدورة</Link>
      </div>
      <CourseCurriculumEditor courseId={id} />
    </AdminShell>
  );
}
