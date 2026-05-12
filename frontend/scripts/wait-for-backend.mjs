import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..", "..");
const env = loadEnv(process.env.NODE_ENV || "development", repoRoot, "");
Object.assign(process.env, env);

const target = process.env.VITE_PROXY_TARGET || "http://localhost:5000";
const healthUrl = new URL("/api/health", target).toString();
const timeoutMs = Number(process.env.BACKEND_WAIT_TIMEOUT_MS || 60_000);
const startedAt = Date.now();

process.stdout.write(`Waiting for backend at ${healthUrl}`);

while (Date.now() - startedAt < timeoutMs) {
    try {
        const response = await fetch(healthUrl);
        if (response.ok) {
            process.stdout.write("\nBackend is ready.\n");
            process.exit(0);
        }
    } catch {
        // Backend is still starting.
    }

    process.stdout.write(".");
    await new Promise((resolve) => setTimeout(resolve, 1000));
}

process.stdout.write("\n");
console.error(`Backend did not become ready within ${timeoutMs / 1000}s: ${healthUrl}`);
process.exit(1);
