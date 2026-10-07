import mongoose, { Schema, type Model } from "mongoose";

export interface ICourseSection {
  _id: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  title: string;
  description: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

const courseSectionSchema = new Schema<ICourseSection>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    description: { type: String, default: "", trim: true, maxlength: 1000 },
    order: { type: Number, default: 0, min: 0, required: true },
  },
  { timestamps: true }
);

courseSectionSchema.index({ course: 1, order: 1, _id: 1 });

export const CourseSection: Model<ICourseSection> =
  mongoose.models.CourseSection ??
  mongoose.model<ICourseSection>("CourseSection", courseSectionSchema);
