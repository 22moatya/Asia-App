import { z } from "zod";
import { COURSE_LEVELS, COURSE_STATUSES } from "@/models/Course";
import { ORDER_STATUSES } from "@/models/Order";

const safeUrl = z
  .string()
  .trim()
  .max(2000)
  .refine((value) => {
    if (!value) return true;
    try {
      const url = new URL(value);
      return url.protocol === "https:" || url.protocol === "http:";
    } catch {
      return false;
    }
  }, "Enter a valid HTTP or HTTPS URL.");

const textList = (maxItems: number, maxLength: number) =>
  z
    .array(z.string().trim().min(1).max(maxLength))
    .max(maxItems);

export const adminCourseSchema = z
  .object({
    title: z.string().trim().min(2).max(200),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(220),
    shortDescription: z.string().trim().min(1).max(300),
    description: z.string().trim().min(1).max(20000),
    thumbnail: safeUrl,
    category: z.string().regex(/^[0-9a-fA-F]{24}$/),
    instructor: z.string().trim().min(2).max(150),
    price: z.number().finite().min(0).max(100000000),
    originalPrice: z.number().finite().min(0).max(100000000),
    level: z.enum(COURSE_LEVELS),
    language: z.string().trim().min(2).max(60),
    durationMinutes: z.number().int().min(0).max(100000),
    lessonsCount: z.number().int().min(0).max(10000),
    requirements: textList(30, 300),
    learningOutcomes: textList(30, 300),
    tags: textList(20, 50),
    featured: z.boolean(),
    status: z.enum(COURSE_STATUSES),
  })
  .strict()
  .refine((course) => course.price <= course.originalPrice, {
    message: "The current price cannot exceed the original price.",
    path: ["price"],
  });

export const adminCategorySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(120),
    description: z.string().trim().max(500),
    image: safeUrl,
    isActive: z.boolean(),
    order: z.number().int().min(0).max(100000),
  })
  .strict();

export const adminCategoryPatchSchema = z
  .object({
    name: z.string().trim().min(2).max(100).optional(),
    slug: z
      .string()
      .trim()
      .toLowerCase()
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
      .max(120)
      .optional(),
    description: z.string().trim().max(500).optional(),
    image: safeUrl.optional(),
    isActive: z.boolean().optional(),
    order: z.number().int().min(0).max(100000).optional(),
  })
  .strict()
  .refine((category) => Object.keys(category).length > 0, {
    message: "At least one category field must be provided.",
  });

export const adminStudentStatusSchema = z
  .object({ isActive: z.boolean() })
  .strict();

export const adminListQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).max(100000).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const adminCourseListQuerySchema = adminListQuerySchema.extend({
  status: z.enum(COURSE_STATUSES).optional(),
});

export const adminStudentListQuerySchema = adminListQuerySchema.extend({
  isActive: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export const adminOrderListQuerySchema = adminListQuerySchema.extend({
  status: z.enum(ORDER_STATUSES).optional(),
});
