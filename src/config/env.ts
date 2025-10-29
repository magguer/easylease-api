import "dotenv/config";

export const env = {
  PORT: Number(process.env.PORT || 4000),
  MONGODB_URI: process.env.MONGODB_URI || "",
  NODE_ENV: process.env.NODE_ENV || "development",
  SUPABASE_URL: process.env.SUPABASE_URL || "",
  SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
};

if (!env.MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in .env");
}

if (!env.SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL in .env");
}

if (!env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in .env");
}
