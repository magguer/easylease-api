import { Schema, model } from "mongoose";

const ListingSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true, index: true },
    address: { type: String, required: true },
    suburb: { type: String, index: true },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        default: "Point",
      },
      coordinates: {
        type: [Number],
        index: "2dsphere",
      },
    },
    room_type: {
      type: String,
      enum: ["master", "double", "single"],
      index: true,
    },
    preferred_tenants: { type: [String], default: [] },
    house_features: { type: [String], default: [] },
    rules: { type: [String], default: [] },
    images: { type: [String], default: [] },
    owner_id: {
      type: Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
      index: true,
    },
    locale: {
      type: String,
      enum: ["es", "en"],
      default: "es",
    },
  },
  { timestamps: true }
);

ListingSchema.index({
  title: "text",
  suburb: "text",
  rules: "text",
  house_features: "text",
});

export default model("Listing", ListingSchema);
