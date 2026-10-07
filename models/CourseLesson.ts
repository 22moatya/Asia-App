import mongoose, { Schema, type Model } from "mongoose";

export const LESSON_TYPES = ["video", "text", "pdf", "file"] as const;
export type LessonType = (typeof LESSON_TYPES)[number];

export interface ILessonResource {
  title: string;
  url: string;
}

export interface ICourseLesson {
  _id: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  section: mongoose.Types.ObjectId;
  title: string;
  description: string;
  type: LessonType;
  videoUrl: string;
  content: string;
  durationMinutes: number;
  resources: ILessonResource[];
  isFree: boolean;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const resourceSchema = new Schema<ILessonResource>(
  {
    title: { type: String, required: true, trim: true, maxlength: 150 },
    url: { type: String, required: true, trim: true, maxlength: 2000 },
  },
  { _id: false }
);

const courseLessonSchema = new Schema<ICourseLesson>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    section: {
      type: Schema.Types.ObjectId,
      ref: "CourseSection",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 300 },
    description: { type: String, default: "", trim: true, maxlength: 2000 },
    type: { type: String, enum: LESSON_TYPES, required: true },
    videoUrl: { type: String, default: "", trim: true, maxlength: 2000 },
    content: { type: String, default: "", maxlength: 500000 },
    durationMinutes: { type: Number, default: 0, min: 0, max: 100000 },
    resources: {
      type: [resourceSchema],
      default: [],
      validate: {
        validator: (resources: ILessonResource[]) => resources.length <= 20,
        message: "A lesson can have at most 20 resources.",
      },
    },
    isFree: { type: Boolean, default: false, required: true },
    order: { type: Number, default: 0, min: 0, required: true },
  },
  { timestamps: true }
);

courseLessonSchema.index({ course: 1, section: 1, order: 1, _id: 1 });

export const CourseLesson: Model<ICourseLesson> =
  mongoose.models.CourseLesson ??
  mongoose.model<ICourseLesson>("CourseLesson", courseLessonSchema);
