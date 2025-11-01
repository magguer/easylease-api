import { Schema, model } from "mongoose";
const LeadSchema = new Schema({
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
}, { timestamps: true });
export default model("Lead", LeadSchema);
