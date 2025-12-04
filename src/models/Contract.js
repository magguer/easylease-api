import mongoose from "mongoose";

const documentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ["contract", "inspection", "addendum", "notice", "receipt", "other"],
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  url: {
    type: String,
    required: true,
  },
  uploaded_at: {
    type: Date,
    default: Date.now,
  },
  uploaded_by: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
});

const termsSchema = new mongoose.Schema({
  pets_allowed: {
    type: Boolean,
    default: false,
  },
  smoking_allowed: {
    type: Boolean,
    default: false,
  },
  parking_spaces: {
    type: Number,
    default: 0,
  },
  special_conditions: {
    type: String,
    default: "",
  },
});

const contractSchema = new mongoose.Schema(
  {
    // Relationships
    tenant_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Tenant",
      required: false, // Opcional - se asigna después de crear el contrato
      index: true,
    },
    listing_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Listing",
      required: true,
      index: true,
    },
    owner_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
      required: true,
      index: true,
    },

    // Dates
    signed_date: {
      type: Date,
      default: Date.now,
    },
    start_date: {
      type: Date,
      required: true,
    },
    end_date: {
      type: Date,
      required: true,
    },
    notice_period_days: {
      type: Number,
      default: 14,
    },

    // Financial
    weekly_rent: {
      type: Number,
      required: true,
    },
    bond_amount: {
      type: Number,
      required: true,
    },
    bond_paid: {
      type: Boolean,
      default: false,
    },
    payment_frequency: {
      type: String,
      enum: ["weekly", "fortnightly", "monthly"],
      default: "weekly",
    },
    bills_included: {
      type: Boolean,
      default: true,
    },

    // Status
    status: {
      type: String,
      enum: ["draft", "available", "active", "ending_soon", "ended", "terminated"],
      default: "draft",
      index: true,
    },
    termination_reason: {
      type: String,
      default: "",
    },
    termination_date: {
      type: Date,
    },

    // Documents
    documents: [documentSchema],

    // Terms
    terms: {
      type: termsSchema,
      default: () => ({}),
    },

    // Metadata
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    updated_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Virtual para calcular días restantes
contractSchema.virtual("days_remaining").get(function () {
  if (this.status !== "active" && this.status !== "ending_soon") {
    return 0;
  }
  const today = new Date();
  const end = new Date(this.end_date);
  const diff = Math.ceil((end - today) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
});

// Virtual para determinar si está terminando pronto (menos de 30 días)
contractSchema.virtual("is_ending_soon").get(function () {
  return this.days_remaining > 0 && this.days_remaining <= 30;
});

// Middleware para actualizar status automáticamente
contractSchema.pre("save", function (next) {
  if (this.status === "active") {
    const daysRemaining = this.days_remaining;
    if (daysRemaining <= 0) {
      this.status = "ended";
    } else if (daysRemaining <= 30) {
      this.status = "ending_soon";
    }
  }
  next();
});

// Indexes compuestos para queries comunes
contractSchema.index({ tenant_id: 1, status: 1 });
contractSchema.index({ listing_id: 1, status: 1 });
contractSchema.index({ owner_id: 1, status: 1 });
contractSchema.index({ end_date: 1, status: 1 });

// Asegurar que virtuals se incluyan en JSON
contractSchema.set("toJSON", { virtuals: true });
contractSchema.set("toObject", { virtuals: true });

const Contract = mongoose.model("Contract", contractSchema);

export default Contract;
