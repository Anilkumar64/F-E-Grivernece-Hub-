import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import fs from "fs";
import path from "path";

let mongo;
let app;

beforeAll(async () => {
  // Important: do NOT set NODE_ENV=test here, because rate limiters
  // are effectively disabled in test mode.
  process.env.NODE_ENV = "development";
  process.env.EMAIL_ENABLED = "false";
  process.env.ACCESS_TOKEN_SECRET = "a".repeat(64);
  process.env.REFRESH_TOKEN_SECRET = "b".repeat(64);

  // Avoid partial/corrupt downloads causing HTTP 416
  const dlDir = path.join(process.cwd(), ".cache", "mongodb-binaries-rate");
  fs.rmSync(dlDir, { recursive: true, force: true });
  fs.mkdirSync(dlDir, { recursive: true });
  process.env.MONGOMS_DOWNLOAD_DIR = dlDir;

  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URL = mongo.getUri("egrievance_rate_limit_test");

  ({ app } = await import("../server.js"));
  await mongoose.connect(process.env.MONGODB_URL, { maxPoolSize: 10 });

  const SiteConfig = (await import("../src/models/SiteConfig.js")).default;
  await SiteConfig.create({
    key: "global",
    security: { maxLoginAttempts: 10_000, lockoutMinutes: 15, stepUpWindowMinutes: 10 },
  });

  const User = (await import("../src/models/User.js")).default;
  await User.create({
    name: "Alice",
    email: "alice@example.com",
    password: "Passw0rd!",
    role: "student",
    studentId: "S9001",
  });
}, 900_000);

describe("Rate limiting (auth endpoints)", () => {
  it("blocks too many login attempts with 429", async () => {
    // authLimiter limit = 10 in non-test env. Do 11.
    for (let i = 0; i < 10; i++) {
      // wrong password to keep it simple
      await request(app)
        .post("/api/auth/student/login")
        .send({ email: "alice@example.com", password: "wrong-pass" })
        .expect(401);
    }

    const blocked = await request(app)
      .post("/api/auth/student/login")
      .send({ email: "alice@example.com", password: "wrong-pass" });

    expect(blocked.status).toBe(429);
    expect(blocked.body?.message || "").toMatch(/too many/i);
  });
});

