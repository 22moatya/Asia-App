import mongoose, { Schema, type Model } from "mongoose";

export const ENROLLMENT_STATUSES = ["active", "revoked"] as const;
export type EnrollmentStatus = (typeof ENROLLMENT_STATUSES)[number];

export interface IEnrollment {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  course: mongoose.Types.ObjectId;
  order: mongoose.Types.ObjectId | null;
  status: EnrollmentStatus;
  completedLessons: mongoose.Types.ObjectId[];
  currentLesson: mongoose.Types.ObjectId | null;
  progressPercentage: number;
  enrolledAt: Date;
  lastAccessedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const enrollmentSchema = new Schema<IEnrollment>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
      index: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      default: null,
    },
    status: {
      type: String,
      enum: ENROLLMENT_STATUSES,
      default: "active",
      required: true,
    },
    completedLessons: {
      type: [{ type: Schema.Types.ObjectId, ref: "CourseLesson" }],
      default: [],
    },
    currentLesson: {
      type: Schema.Types.ObjectId,
      ref: "CourseLesson",
      default: null,
    },
    progressPercentage: { type: Number, default: 0, min: 0, max: 100 },
    enrolledAt: { type: Date, default: Date.now, required: true },
    lastAccessedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

enrollmentSchema.index({ user: 1, course: 1 }, { unique: true });
enrollmentSchema.index({ user: 1, status: 1, enrolledAt: -1 });

export const Enrollment: Model<IEnrollment> =
  mongoose.models.Enrollment ??
  mongoose.model<IEnrollment>("Enrollment", enrollmentSchema);
