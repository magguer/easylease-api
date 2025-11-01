import "dotenv/config";
export const env = {
    PORT: Number(process.env.PORT || 4000),
    MONGODB_URI: process.env.MONGODB_URI || "",
    NODE_ENV: process.env.NODE_ENV || "development",
    SUPABASE_URL: process.env.SUPABASE_URL || "",
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY || "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
};
// Optional: Warn if missing in production
if (process.env.NODE_ENV === "production") {
    if (!env.MONGODB_URI) {
        console.warn("⚠️  Warning: MONGODB_URI is not set");
    }
    if (!env.SUPABASE_URL) {
        console.warn("⚠️  Warning: SUPABASE_URL is not set");
    }
    if (!env.SUPABASE_SERVICE_ROLE_KEY) {
        console.warn("⚠️  Warning: SUPABASE_SERVICE_ROLE_KEY is not set");
    }
}
