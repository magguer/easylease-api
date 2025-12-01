import { Schema, model } from "mongoose";

const TenantSchema = new Schema(
  {
    // Personal Information
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    
    // Emergency Contact
    emergency_contact: {
      name: String,
      phone: String,
      relationship: String,
    },

    // Current Assignment (for quick access)
    owner_id: {
      type: Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
      index: true,
    },
    current_contract_id: {
      type: Schema.Types.ObjectId,
      ref: "Contract",
      index: true,
    },
    
    // Status (simplified - derived from current contract)
    status: {
      type: String,
      enum: ["active", "ending_soon", "ended", "available"],
      default: "available",
      index: true,
    },
    
    // Documents (personal documents, not contract-specific)
    documents: {
      id_document: String,
      proof_of_income: String,
      references: [String],
      other: [String],
    },
    
    // Notes
    notes: {
      type: String,
      default: "",
    },
    
    // Converted from lead
    converted_from_lead_id: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
    },
  },
  { timestamps: true }
);

// Index for searching
TenantSchema.index({ name: "text", email: "text" });

TenantSchema.set("toJSON", { virtuals: true });
TenantSchema.set("toObject", { virtuals: true });

export default model("Tenant", TenantSchema);
