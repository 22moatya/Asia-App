import { z } from "zod";
import { LESSON_TYPES } from "@/models/CourseLesson";

const webUrl = z
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

export const sectionSchema = z
  .object({
    title: z.string().trim().min(1).max(200),
    description: z.string().trim().max(1000).default(""),
    order: z.number().int().min(0).max(10000).default(0),
  })
  .strict();

const lessonResourceSchema = z
  .object({
    title: z.string().trim().min(1).max(150),
    url: webUrl.refine((value) => value.length > 0, "Resource URL is required."),
  })
  .strict();

export const lessonSchema = z
  .object({
    sectionId: z.string().regex(/^[a-fA-F0-9]{24}$/),
    title: z.string().trim().min(1).max(300),
    description: z.string().trim().max(2000).default(""),
    type: z.enum(LESSON_TYPES),
    videoUrl: webUrl.default(""),
    content: z.string().max(500000).default(""),
    durationMinutes: z.number().int().min(0).max(100000).default(0),
    resources: z.array(lessonResourceSchema).max(20).default([]),
    isFree: z.boolean().default(false),
    order: z.number().int().min(0).max(10000).default(0),
  })
  .strict();

export const sectionUpdateSchema = sectionSchema.partial().strict();

export const lessonProgressSchema = z
  .object({
    lessonId: z.string().regex(/^[a-fA-F0-9]{24}$/),
    completed: z.boolean().default(false),
  })
  .strict();
