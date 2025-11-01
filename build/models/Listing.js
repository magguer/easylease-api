import { Schema, model } from "mongoose";
const ListingSchema = new Schema({
    title: { type: String, required: true },
    slug: { type: String, unique: true, index: true },
    price_per_week: { type: Number, required: true },
    bond: { type: Number, default: 0 },
    bills_included: { type: Boolean, default: true },
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
    available_from: { type: Date, index: true },
    min_term_weeks: { type: Number, default: 12 },
    preferred_tenants: { type: [String], default: [] },
    house_features: { type: [String], default: [] },
    rules: { type: [String], default: [] },
    images: { type: [String], default: [] },
    owner_partner_id: {
        type: Schema.Types.ObjectId,
        ref: "Partner",
        index: true,
    },
    status: {
        type: String,
        enum: ["draft", "published", "reserved", "rented"],
        default: "draft",
        index: true,
    },
    locale: {
        type: String,
        enum: ["es", "en"],
        default: "es",
    },
}, { timestamps: true });
ListingSchema.index({
    title: "text",
    suburb: "text",
    rules: "text",
    house_features: "text",
});
export default model("Listing", ListingSchema);
