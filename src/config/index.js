const config = {
  port: process.env.APP_PORT || 8008,
  allowedOriginsCors: [
    "http://localhost:3000",  // Frontend web local
    "http://localhost:3001",  // Frontend admin local
    "http://192.168.0.98:8081", // Expo dev server
    "https://easylease-frontend-admin.vercel.app", // Admin en producción
    "https://easylease-frontend-web.vercel.app", // Web en producción
  ],
};

export default config;
