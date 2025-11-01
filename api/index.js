import { app } from "../build/src/server.js";// Vercel serverless entry: re-export the compiled Express app.

// The build step should produce `dist/app.js` from `src/app.ts`.

export default app;// If `dist/app.js` is missing (build failed), export a temporary handler

// so Vercel doesn't fail with an unmatched pattern — the build logs
// will still indicate TypeScript errors to fix.
import { existsSync } from 'fs';

const distAppPath = new URL('../dist/app.js', import.meta.url).pathname;

let exportedFunction;
if (existsSync(distAppPath)) {
  // Re-export the compiled Express app as the default export for Vercel
  const mod = await import(distAppPath);
  exportedFunction = mod.default ?? mod;
} else {
  // Temporary fallback handler while the build is being fixed
  exportedFunction = function handler(req, res) {
    res.statusCode = 503;
    res.setHeader('content-type', 'application/json');
    res.end(JSON.stringify({ error: 'Build output not found', path: distAppPath }));
  };
}

export default exportedFunction;
