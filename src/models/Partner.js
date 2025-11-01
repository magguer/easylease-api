import { Schema, model } from "mongoose";

const PartnerSchema = new Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    phone: { type: String },
    company_name: { type: String },
    status: {
      type: String,
      enum: ["active", "inactive", "pending"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true }
);

export default model("Partner", PartnerSchema);
