import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "node",
        testTimeout: 60000,
        hookTimeout: 60000,
        globals: false,
        pool: "forks",
        singleFork: true,
        sequence: { concurrent: false },
        include: ["tests/**/*.test.js"],
        reporter: ["verbose"],
    },
});