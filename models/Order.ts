import mongoose, { Schema, type Model } from "mongoose";

export const ORDER_STATUSES = [
  "pending",
  "paid",
  "failed",
  "cancelled",
  "refunded",
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface IOrderItem {
  course: mongoose.Types.ObjectId;
  title: string;
  slug: string;
  price: number;
}

export interface IOrder {
  _id: mongoose.Types.ObjectId;
  user: mongoose.Types.ObjectId;
  items: IOrderItem[];
  subtotal: number;
  discount: number;
  total: number;
  currency: string;
  status: OrderStatus;
  provider: "kashier";
  merchantOrderId: string;
  paymentSessionId: string;
  paymentSessionUrl: string;
  checkoutKey?: string;
  transactionId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>(
  {
    course: {
      type: Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    slug: { type: String, required: true, trim: true, maxlength: 220 },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const orderSchema = new Schema<IOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
      validate: {
        validator: (items: IOrderItem[]) => items.length >= 1 && items.length <= 20,
        message: "An order must contain between 1 and 20 courses.",
      },
    },
    subtotal: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    total: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: "EGP", enum: ["EGP"] },
    status: {
      type: String,
      enum: ORDER_STATUSES,
      default: "pending",
      required: true,
    },
    provider: { type: String, enum: ["kashier"], default: "kashier" },
    merchantOrderId: { type: String, default: "", trim: true, maxlength: 100 },
    paymentSessionId: { type: String, default: "", trim: true, maxlength: 200 },
    paymentSessionUrl: { type: String, default: "", trim: true, maxlength: 2000 },
    checkoutKey: { type: String, trim: true, maxlength: 100 },
    transactionId: { type: String, default: "", trim: true, maxlength: 200 },
    customerName: { type: String, required: true, trim: true, maxlength: 100 },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    customerPhone: { type: String, default: "", trim: true, maxlength: 40 },
  },
  { timestamps: true }
);

orderSchema.index({ createdAt: -1, _id: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index(
  { merchantOrderId: 1 },
  { unique: true, partialFilterExpression: { merchantOrderId: { $gt: "" } } }
);
orderSchema.index(
  { checkoutKey: 1 },
  { unique: true, partialFilterExpression: { checkoutKey: { $type: "string" } } }
);

export const Order: Model<IOrder> =
  mongoose.models.Order ?? mongoose.model<IOrder>("Order", orderSchema);
