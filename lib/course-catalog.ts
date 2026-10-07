import { z } from "zod";
import { Category } from "@/models/Category";
import { Course, type CourseLevel } from "@/models/Course";
import { connectDB } from "@/lib/mongodb";

const optionalPrice = z
  .string()
  .trim()
  .regex(/^\d{1,8}(?:\.\d{1,2})?$/)
  .transform(Number)
  .optional();

const courseQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    category: z
      .string()
      .trim()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(120)
      .optional(),
    level: z.enum(["beginner", "intermediate", "advanced"]).optional(),
    minPrice: optionalPrice,
    maxPrice: optionalPrice,
    rating: z.enum(["4", "4.5"]).transform(Number).optional(),
    sort: z
      .enum(["latest", "popular", "rating", "price-asc", "price-desc"])
      .default("latest"),
    page: z.string().regex(/^[1-9]\d{0,5}$/).transform(Number).default(1),
    limit: z.string().regex(/^[1-9]\d{0,2}$/).transform(Number).default(12),
  })
  .superRefine((filters, context) => {
    if (filters.limit > 48) {
      context.addIssue({
        code: "custom",
        message: "Page size cannot exceed 48.",
        path: ["limit"],
      });
    }
    if (
      filters.minPrice !== undefined &&
      filters.maxPrice !== undefined &&
      filters.minPrice > filters.maxPrice
    ) {
      context.addIssue({
        code: "custom",
        message: "Minimum price cannot exceed maximum price.",
        path: ["maxPrice"],
      });
    }
  });

export interface CourseFilters {
  q?: string;
  category?: string;
  level?: CourseLevel;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  sort: "latest" | "popular" | "rating" | "price-asc" | "price-desc";
  page: number;
  limit: number;
}

export function parseCourseFilters(
  params: Record<string, string | string[] | undefined>
) {
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  return courseQuerySchema.safeParse({
    q: first(params.q),
    category: first(params.category),
    level: first(params.level),
    minPrice: first(params.minPrice),
    maxPrice: first(params.maxPrice),
    rating: first(params.rating),
    sort: first(params.sort),
    page: first(params.page),
    limit: first(params.limit),
  });
}

export interface CourseCardData {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  thumbnail: string;
  category: { name: string; slug: string } | null;
  instructor: string;
  price: number;
  originalPrice: number;
  level: CourseLevel;
  durationMinutes: number;
  lessonsCount: number;
  studentsCount: number;
  rating: number;
  reviewsCount: number;
  featured: boolean;
}

export interface CourseDetailData extends CourseCardData {
  description: string;
  language: string;
  requirements: string[];
  learningOutcomes: string[];
  tags: string[];
  updatedAt: string;
}

interface PopulatedCategory {
  _id: { toString(): string };
  name: string;
  slug: string;
}

interface PopulatedCourse {
  _id: { toString(): string };
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  thumbnail: string;
  category: PopulatedCategory | null;
  instructor: string;
  price: number;
  originalPrice: number;
  level: CourseLevel;
  language: string;
  durationMinutes: number;
  lessonsCount: number;
  requirements: string[];
  learningOutcomes: string[];
  tags: string[];
  featured: boolean;
  studentsCount: number;
  rating: number;
  reviewsCount: number;
  updatedAt: Date;
}

function serializeCourse(course: PopulatedCourse): CourseCardData {
  return {
    id: course._id.toString(),
    title: course.title,
    slug: course.slug,
    shortDescription: course.shortDescription,
    thumbnail: course.thumbnail,
    category: course.category
      ? { name: course.category.name, slug: course.category.slug }
      : null,
    instructor: course.instructor,
    price: course.price,
    originalPrice: course.originalPrice,
    level: course.level,
    durationMinutes: course.durationMinutes,
    lessonsCount: course.lessonsCount,
    studentsCount: course.studentsCount,
    rating: course.rating,
    reviewsCount: course.reviewsCount,
    featured: course.featured,
  };
}

export async function getActiveCategories() {
  await connectDB();
  const categories = await Category.find({ isActive: true })
    .select("name slug description image order")
    .sort({ order: 1, name: 1 })
    .lean()
    .exec();

  return categories.map((category) => ({
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
  }));
}

export async function getCategoryCounts() {
  await connectDB();
  const categories = await Category.aggregate<{
    _id: { toString(): string };
    name: string;
    slug: string;
    description: string;
    image: string;
    count: number;
  }>([
    { $match: { isActive: true } },
    {
      $lookup: {
        from: Course.collection.name,
        let: { categoryId: "$_id" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$category", "$$categoryId"] },
                  { $eq: ["$status", "published"] },
                ],
              },
            },
          },
          { $count: "count" },
        ],
        as: "publishedCourses",
      },
    },
    {
      $addFields: {
        count: { $ifNull: [{ $arrayElemAt: ["$publishedCourses.count", 0] }, 0] },
      },
    },
    { $project: { name: 1, slug: 1, description: 1, image: 1, count: 1 } },
    { $sort: { name: 1 } },
  ]).exec();

  return categories.map((category) => ({
    id: category._id.toString(),
    name: category.name,
    slug: category.slug,
    description: category.description,
    image: category.image,
    courseCount: category.count,
  }));
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listPublishedCourses(filters: CourseFilters) {
  await connectDB();

  const query: Record<string, unknown> = { status: "published" };
  if (filters.category) {
    const category = await Category.findOne({
      slug: filters.category,
      isActive: true,
    })
      .select("_id")
      .lean()
      .exec();

    if (!category) {
      return {
        courses: [] as CourseCardData[],
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
    query.category = category._id;
  } else {
    const activeCategories = await Category.find({ isActive: true })
      .select("_id")
      .lean()
      .exec();
    if (!activeCategories.length) {
      return {
        courses: [] as CourseCardData[],
        pagination: {
          page: filters.page,
          limit: filters.limit,
          total: 0,
          totalPages: 0,
        },
      };
    }
    query.category = { $in: activeCategories.map((category) => category._id) };
  }
  if (filters.q) {
    const search = new RegExp(escapeRegex(filters.q), "i");
    query.$or = [
      { title: search },
      { shortDescription: search },
      { description: search },
      { instructor: search },
      { tags: search },
    ];
  }
  if (filters.level) {
    query.level = filters.level;
  }
  if (filters.rating !== undefined) {
    query.rating = { $gte: filters.rating };
  }
  if (filters.minPrice !== undefined || filters.maxPrice !== undefined) {
    query.price = {
      ...(filters.minPrice !== undefined && { $gte: filters.minPrice }),
      ...(filters.maxPrice !== undefined && { $lte: filters.maxPrice }),
    };
  }

  const sortBy = {
    latest: { createdAt: -1, _id: -1 },
    popular: { studentsCount: -1, createdAt: -1, _id: -1 },
    rating: { rating: -1, reviewsCount: -1, _id: -1 },
    "price-asc": { price: 1, _id: 1 },
    "price-desc": { price: -1, _id: -1 },
  } as const;

  const total = await Course.countDocuments(query).exec();
  const totalPages = Math.ceil(total / filters.limit);
  if (filters.page > totalPages) {
    return {
      courses: [] as CourseCardData[],
      pagination: {
        page: filters.page,
        limit: filters.limit,
        total,
        totalPages,
      },
    };
  }

  const courses = await Course.find(query)
      .select(
        "title slug shortDescription thumbnail category instructor price originalPrice level durationMinutes lessonsCount studentsCount rating reviewsCount featured"
      )
      .populate<{ category: PopulatedCategory | null }>(
        "category",
        "name slug"
      )
      .sort(sortBy[filters.sort])
      .skip((filters.page - 1) * filters.limit)
      .limit(filters.limit)
      .lean<PopulatedCourse[]>()
      .exec();

  return {
    courses: courses.map(serializeCourse),
    pagination: {
      page: filters.page,
      limit: filters.limit,
      total,
      totalPages,
    },
  };
}

export async function getFeaturedCourses(limit = 3) {
  await connectDB();
  const activeCategories = await Category.find({ isActive: true })
    .select("_id")
    .lean()
    .exec();
  if (!activeCategories.length) {
    return [];
  }
  const courses = await Course.find({
    status: "published",
    featured: true,
    category: { $in: activeCategories.map((category) => category._id) },
  })
    .select(
      "title slug shortDescription thumbnail category instructor price originalPrice level durationMinutes lessonsCount studentsCount rating reviewsCount featured"
    )
    .populate<{ category: PopulatedCategory | null }>("category", "name slug")
    .sort({ createdAt: -1, _id: -1 })
    .limit(Math.min(Math.max(limit, 1), 12))
    .lean<PopulatedCourse[]>()
    .exec();

  return courses.map(serializeCourse);
}

export async function getPublishedCourseBySlug(
  slug: string
): Promise<CourseDetailData | null> {
  await connectDB();
  const course = await Course.findOne({ slug, status: "published" })
    .populate<{ category: PopulatedCategory | null }>({
      path: "category",
      select: "name slug",
      match: { isActive: true },
    })
    .lean<PopulatedCourse>()
    .exec();

  if (!course || !course.category) {
    return null;
  }

  return {
    ...serializeCourse(course),
    description: course.description,
    language: course.language,
    requirements: course.requirements,
    learningOutcomes: course.learningOutcomes,
    tags: course.tags,
    updatedAt: course.updatedAt.toISOString(),
  };
}
