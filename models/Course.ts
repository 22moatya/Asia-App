import mongoose, { Schema, type Model } from "mongoose";

export const COURSE_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
] as const;
export type CourseLevel = (typeof COURSE_LEVELS)[number];

export const COURSE_STATUSES = ["draft", "published", "archived"] as const;
export type CourseStatus = (typeof COURSE_STATUSES)[number];

export interface ICourse {
  _id: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  shortDescription: string;
  description: string;
  thumbnail: string;
  category: mongoose.Types.ObjectId;
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
  status: CourseStatus;
  studentsCount: number;
  rating: number;
  reviewsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const courseSchema = new Schema<ICourse>(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
      maxlength: 220,
    },
    shortDescription: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    description: { type: String, required: true, trim: true, maxlength: 20000 },
    thumbnail: { type: String, default: "", trim: true, maxlength: 2000 },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
      index: true,
    },
    instructor: { type: String, required: true, trim: true, maxlength: 150 },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    level: { type: String, enum: COURSE_LEVELS, default: "beginner" },
    language: { type: String, default: "العربية", trim: true, maxlength: 60 },
    durationMinutes: { type: Number, default: 0, min: 0 },
    lessonsCount: { type: Number, default: 0, min: 0 },
    requirements: {
      type: [String],
      default: [],
      validate: {
        validator: (items: string[]) =>
          items.length <= 30 &&
          items.every((item) => item.length > 0 && item.length <= 300),
        message: "A course can have at most 30 requirements of 300 characters.",
      },
    },
    learningOutcomes: {
      type: [String],
      default: [],
      validate: {
        validator: (items: string[]) =>
          items.length <= 30 &&
          items.every((item) => item.length > 0 && item.length <= 300),
        message: "A course can have at most 30 learning outcomes of 300 characters.",
      },
    },
    tags: {
      type: [String],
      default: [],
      validate: {
        validator: (items: string[]) =>
          items.length <= 20 &&
          items.every((item) => item.length > 0 && item.length <= 50),
        message: "A course can have at most 20 tags of 50 characters.",
      },
    },
    featured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: COURSE_STATUSES,
      default: "draft",
      required: true,
    },
    studentsCount: { type: Number, default: 0, min: 0 },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    reviewsCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

courseSchema.index({ slug: 1 }, { unique: true });
courseSchema.index({ status: 1, createdAt: -1 });
courseSchema.index({ status: 1, category: 1, createdAt: -1 });
courseSchema.index({ status: 1, rating: -1 });
courseSchema.index({ status: 1, studentsCount: -1 });
courseSchema.index({ status: 1, price: 1 });
courseSchema.index({ status: 1, featured: 1, createdAt: -1 });

export const Course: Model<ICourse> =
  mongoose.models.Course ?? mongoose.model<ICourse>("Course", courseSchema);
