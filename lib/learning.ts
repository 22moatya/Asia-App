import mongoose from "mongoose";
import { Category } from "@/models/Category";
import { Course } from "@/models/Course";
import { CourseLesson } from "@/models/CourseLesson";
import { CourseSection } from "@/models/CourseSection";
import { Enrollment } from "@/models/Enrollment";
import { connectDB } from "@/lib/mongodb";

interface LessonDocument {
  _id: { toString(): string };
  section: { toString(): string };
  title: string;
  description: string;
  type: "video" | "text" | "pdf" | "file";
  videoUrl: string;
  content: string;
  durationMinutes: number;
  resources: { title: string; url: string }[];
  isFree: boolean;
  order: number;
}

interface SectionDocument {
  _id: { toString(): string };
  title: string;
  description: string;
  order: number;
}

async function getCourseSections(courseId: mongoose.Types.ObjectId) {
  const [sections, lessons] = await Promise.all([
    CourseSection.find({ course: courseId })
      .select("title description order")
      .sort({ order: 1, _id: 1 })
      .lean<SectionDocument[]>()
      .exec(),
    CourseLesson.find({ course: courseId })
      .select(
        "section title description type videoUrl content durationMinutes resources isFree order"
      )
      .sort({ section: 1, order: 1, _id: 1 })
      .lean<LessonDocument[]>()
      .exec(),
  ]);

  return sections.map((section) => ({
    id: section._id.toString(),
    title: section.title,
    description: section.description,
    order: section.order,
    lessons: lessons
      .filter((lesson) => lesson.section.toString() === section._id.toString())
      .map((lesson) => ({
        id: lesson._id.toString(),
        sectionId: lesson.section.toString(),
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        videoUrl: lesson.videoUrl,
        content: lesson.content,
        durationMinutes: lesson.durationMinutes,
        resources: lesson.resources,
        isFree: lesson.isFree,
        order: lesson.order,
      })),
  }));
}

export async function getPublicCourseCurriculum(slug: string) {
  await connectDB();
  const course = await Course.findOne({ slug, status: "published" })
    .select("_id slug title category")
    .lean()
    .exec();
  if (!course) return null;

  const category = await Category.exists({ _id: course.category, isActive: true });
  if (!category) return null;

  const sections = await getCourseSections(course._id);
  return {
    course: {
      id: course._id.toString(),
      slug: course.slug,
      title: course.title,
    },
    sections: sections.map((section) => ({
      ...section,
      lessons: section.lessons.map((lesson) => ({
        id: lesson.id,
        sectionId: lesson.sectionId,
        title: lesson.title,
        description: lesson.description,
        type: lesson.type,
        durationMinutes: lesson.durationMinutes,
        isFree: lesson.isFree,
        order: lesson.order,
        ...(lesson.isFree
          ? {
              videoUrl: lesson.videoUrl,
              content: lesson.content,
              resources: lesson.resources,
            }
          : {}),
      })),
    })),
  };
}

export async function getEnrolledCourse(
  courseId: string,
  userId: string,
  touch = false
) {
  if (
    !mongoose.isValidObjectId(courseId) ||
    !mongoose.isValidObjectId(userId)
  ) {
    return null;
  }

  await connectDB();
  const course = await Course.findOne({
    _id: courseId,
    status: "published",
  })
    .populate({
      path: "category",
      select: "name slug",
      match: { isActive: true },
    })
    .lean()
    .exec();
  if (!course?.category) return null;

  const enrollment = touch
    ? await Enrollment.findOneAndUpdate(
        { course: course._id, user: userId, status: "active" },
        { $set: { lastAccessedAt: new Date() } },
        { returnDocument: "after" }
      )
        .lean()
        .exec()
    : await Enrollment.findOne({
        course: course._id,
        user: userId,
        status: "active",
      })
        .lean()
        .exec();
  if (!enrollment) return null;

  const sections = await getCourseSections(course._id);
  const lessonCount = sections.reduce(
    (total, section) => total + section.lessons.length,
    0
  );
  const completedLessonIds = new Set(
    enrollment.completedLessons.map((lessonId) => lessonId.toString())
  );
  const actualLessonIds = new Set(
    sections.flatMap((section) => section.lessons.map((lesson) => lesson.id))
  );
  const validCompletedLessonIds = [...completedLessonIds].filter((id) =>
    actualLessonIds.has(id)
  );

  return {
    course: {
      id: course._id.toString(),
      slug: course.slug,
      title: course.title,
      shortDescription: course.shortDescription,
      description: course.description,
      thumbnail: course.thumbnail,
      instructor: course.instructor,
      language: course.language,
      level: course.level,
      durationMinutes: course.durationMinutes,
    },
    enrollment: {
      id: enrollment._id.toString(),
      status: enrollment.status,
      enrolledAt: enrollment.enrolledAt.toISOString(),
      lastAccessedAt: enrollment.lastAccessedAt?.toISOString() ?? null,
      currentLesson: enrollment.currentLesson?.toString() ?? null,
      completedLessons: validCompletedLessonIds,
      progressPercentage:
        lessonCount === 0
          ? 0
          : Math.round((validCompletedLessonIds.length / lessonCount) * 100),
    },
    sections: sections.map((section) => ({
      id: section.id,
      title: section.title,
      description: section.description,
      order: section.order,
      lessons: section.lessons.map((lesson) => ({
        ...lesson,
        isCompleted: completedLessonIds.has(lesson.id),
      })),
    })),
  };
}

export async function getStudentCourses(userId: string) {
  await connectDB();
  const enrollments = await Enrollment.find({ user: userId, status: "active" })
    .sort({ lastAccessedAt: -1, enrolledAt: -1 })
    .limit(100)
    .lean()
    .exec();

  if (!enrollments.length) return [];
  const courseIds = enrollments.map((enrollment) => enrollment.course);
  const courses = await Course.find({
    _id: { $in: courseIds },
    status: "published",
  })
    .select("title slug shortDescription thumbnail category instructor lessonsCount")
    .lean()
    .exec();
  const categories = await Category.find({
    _id: { $in: courses.map((course) => course.category) },
    isActive: true,
  })
    .select("name slug")
    .lean()
    .exec();
  const categoryById = new Map(
    categories.map((category) => [category._id.toString(), category])
  );
  const courseById = new Map(
    courses
      .filter((course) => categoryById.has(course.category.toString()))
      .map((course) => [course._id.toString(), course])
  );
  const curriculum = await Promise.all(
    courses
      .filter((course) => categoryById.has(course.category.toString()))
      .map(async (course) => [
        course._id.toString(),
        await getCourseSections(course._id),
      ] as const)
  );
  const sectionsByCourse = new Map(curriculum);

  return enrollments.flatMap((enrollment) => {
    const course = courseById.get(enrollment.course.toString());
    if (!course) return [];
    const category = categoryById.get(course.category.toString());
    if (!category) return [];
    const sections = sectionsByCourse.get(course._id.toString()) ?? [];
    const totalLessons = sections.reduce(
      (total, section) => total + section.lessons.length,
      0
    );
    const lessonIds = new Set(
      sections.flatMap((section) => section.lessons.map((lesson) => lesson.id))
    );
    const completed = enrollment.completedLessons.filter((lessonId) =>
      lessonIds.has(lessonId.toString())
    ).length;
    const firstLesson = sections.find((section) => section.lessons.length)
      ?.lessons[0];

    return [
      {
        id: course._id.toString(),
        title: course.title,
        slug: course.slug,
        shortDescription: course.shortDescription,
        thumbnail: course.thumbnail,
        instructor: course.instructor,
        lessonsCount: totalLessons,
        category: { name: category.name, slug: category.slug },
        enrollment: {
          enrolledAt: enrollment.enrolledAt.toISOString(),
          lastAccessedAt: enrollment.lastAccessedAt?.toISOString() ?? null,
          currentLesson:
            enrollment.currentLesson?.toString() ?? firstLesson?.id ?? null,
          progressPercentage:
            totalLessons === 0
              ? 0
              : Math.round((completed / totalLessons) * 100),
          completedLessonsCount: completed,
        },
      },
    ];
  });
}

export async function getLessonForStudent(
  slug: string,
  lessonId: string,
  userId?: string
) {
  if (!mongoose.isValidObjectId(lessonId)) {
    return { kind: "not-found" as const };
  }
  await connectDB();
  const course = await Course.findOne({ slug, status: "published" })
    .select("_id title category")
    .exec();
  if (!course) return { kind: "not-found" as const };

  const lesson = await CourseLesson.findOne({
    _id: lessonId,
    course: course._id,
  })
    .lean()
    .exec();
  if (!lesson) return { kind: "not-found" as const };
  const category = await Category.exists({
    _id: course.category,
    isActive: true,
  });
  if (!category) return { kind: "not-found" as const };

  let enrollment = null;
  if (userId && mongoose.isValidObjectId(userId)) {
    enrollment = await Enrollment.findOne({
      course: course._id,
      user: userId,
      status: "active",
    })
      .select("_id")
      .lean()
      .exec();
  }

  if (!lesson.isFree && !enrollment) {
    return { kind: "forbidden" as const };
  }
  return {
    kind: "ok" as const,
    courseId: course._id.toString(),
    lesson: {
      id: lesson._id.toString(),
      sectionId: lesson.section.toString(),
      title: lesson.title,
      description: lesson.description,
      type: lesson.type,
      videoUrl: lesson.videoUrl,
      content: lesson.content,
      durationMinutes: lesson.durationMinutes,
      resources: lesson.resources,
      isFree: lesson.isFree,
    },
    isEnrolled: Boolean(enrollment),
  };
}
