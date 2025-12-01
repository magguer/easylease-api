import { Schema, model } from "mongoose";

const OwnerSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String },
    company: { type: String },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "active",
      index: true,
    },
  },
  { timestamps: true }
);

export default model("Owner", OwnerSchema, "owners");
