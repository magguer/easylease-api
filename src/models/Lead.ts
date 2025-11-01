import { Schema, model } from "mongoose";

export interface ILead {
  name: string;
  email: string;
  phone?: string;
  message?: string;
  listing_id?: Schema.Types.ObjectId;
  status: "new" | "contacted" | "converted" | "discarded";
  createdAt?: Date;
  updatedAt?: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, index: true },
    phone: { type: String },
    message: { type: String },
    listing_id: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      index: true,
    },
    status: {
      type: String,
      enum: ["new", "contacted", "converted", "discarded"],
      default: "new",
      index: true,
    },
  },
  { timestamps: true }
);

export default model<ILead>("Lead", LeadSchema);
