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

    // Lease Information
    listing_id: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    lease_start: {
      type: Date,
      required: true,
      index: true,
    },
    lease_end: {
      type: Date,
      required: true,
      index: true,
    },
    
    // Financial
    weekly_rent: {
      type: Number,
      required: true,
    },
    bond_paid: {
      type: Number,
      required: true,
    },
    payment_method: {
      type: String,
      enum: ["bank_transfer", "cash", "card", "other"],
      default: "bank_transfer",
    },
    
    // Status
    status: {
      type: String,
      enum: ["active", "ending_soon", "ended", "terminated"],
      default: "active",
      index: true,
    },
    
    // Documents
    documents: {
      id_document: String,
      proof_of_income: String,
      references: [String],
      lease_agreement: String,
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
    
    // Move-in inspection
    move_in_inspection: {
      date: Date,
      photos: [String],
      notes: String,
      condition_report: String,
    },
  },
  { timestamps: true }
);

// Index for searching
TenantSchema.index({ name: "text", email: "text" });

// Virtual for lease duration in weeks
TenantSchema.virtual("lease_duration_weeks").get(function () {
  if (!this.lease_start || !this.lease_end) return 0;
  const diffTime = Math.abs(this.lease_end - this.lease_start);
  const diffWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));
  return diffWeeks;
});

// Virtual for days remaining
TenantSchema.virtual("days_remaining").get(function () {
  if (!this.lease_end || this.status !== "active") return 0;
  const today = new Date();
  const diffTime = this.lease_end - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 0;
});

// Method to check if lease is ending soon (within 30 days)
TenantSchema.methods.isEndingSoon = function () {
  const daysRemaining = this.days_remaining;
  return daysRemaining > 0 && daysRemaining <= 30;
};

// Update status based on lease dates
TenantSchema.pre("save", function (next) {
  if (this.status === "active" && this.isEndingSoon()) {
    this.status = "ending_soon";
  }
  next();
});

TenantSchema.set("toJSON", { virtuals: true });
TenantSchema.set("toObject", { virtuals: true });

export default model("Tenant", TenantSchema);
