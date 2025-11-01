import { Schema, model } from "mongoose";

export interface IPartner {
  name: string;
  email: string;
  phone?: string;
  company_name?: string;
  status: "active" | "inactive" | "pending";
  createdAt?: Date;
  updatedAt?: Date;
}

const PartnerSchema = new Schema<IPartner>(
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

export default model<IPartner>("Partner", PartnerSchema);
