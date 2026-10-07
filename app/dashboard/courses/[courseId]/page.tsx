import { notFound } from "next/navigation";
import { LearningPlayer } from "@/components/learning/LearningPlayer";
import { getCurrentUser } from "@/lib/api-auth";
import { getEnrolledCourse } from "@/lib/learning";

type StudentCoursePageProps = {
  params: Promise<{ courseId: string }>;
};

export default async function StudentCoursePage({
  params,
}: StudentCoursePageProps) {
  const [{ courseId }, user] = await Promise.all([params, getCurrentUser()]);
  if (!user) return null;
  const course = await getEnrolledCourse(courseId, user.id);
  if (!course) notFound();
  return <LearningPlayer courseId={courseId} />;
}
