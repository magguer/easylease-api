import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function bootstrap() {
  try {
    await connectDB();
    
    app.listen(env.PORT, () => {
      console.log(`🚀 EasyLease API running on http://localhost:${env.PORT}`);
      console.log(`📊 Health check: http://localhost:${env.PORT}/api/health`);
      console.log(`🌍 Environment: ${env.NODE_ENV}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap();
