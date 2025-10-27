import "dotenv/config";

export const env = {
  PORT: Number(process.env.PORT || 4000),
  MONGODB_URI: process.env.MONGODB_URI || "",
  NODE_ENV: process.env.NODE_ENV || "development",
};

if (!env.MONGODB_URI) {
  throw new Error("Missing MONGODB_URI in .env");
}
