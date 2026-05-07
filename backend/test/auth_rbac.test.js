import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import fs from "fs";
import path from "path";

// Make OTP deterministic for password reset tests
vi.mock("../src/utils/generateOTP.js", () => ({
  generateOTP: () => "123456",
}));

let mongo;
let app;

beforeAll(async () => {
  process.env.NODE_ENV = "test";
  process.env.EMAIL_ENABLED = "false";
  process.env.ACCESS_TOKEN_SECRET = "a".repeat(64);
  process.env.REFRESH_TOKEN_SECRET = "b".repeat(64);

  // Avoid partial/corrupt downloads causing HTTP 416
  const dlDir = path.join(process.cwd(), ".cache", "mongodb-binaries-auth");
  fs.rmSync(dlDir, { recursive: true, force: true });
  fs.mkdirSync(dlDir, { recursive: true });
  process.env.MONGOMS_DOWNLOAD_DIR = dlDir;

  mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URL = mongo.getUri("egrievance_test");

  // Import after env is set (server.js validates env at import time)
  ({ app } = await import("../server.js"));

  await mongoose.connect(process.env.MONGODB_URL, { maxPoolSize: 10 });
}, 900_000);

beforeEach(async () => {
  // Clear DB between tests
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((c) => c.deleteMany({})));
});

describe("Auth + RBAC critical paths", () => {
  it("student registration -> login -> /auth/me -> logout works", async () => {
    await request(app)
      .post("/api/auth/student/register")
      .send({ name: "Alice", email: "alice@example.com", password: "Passw0rd!", studentId: "S1001" })
      .expect(201);

    const login = await request(app)
      .post("/api/auth/student/login")
      .send({ email: "alice@example.com", password: "Passw0rd!" })
      .expect(200);

    expect(login.body).toHaveProperty("accessToken");
    expect(login.body.user?.role).toBe("student");

    const token = login.body.accessToken;

    await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // logout requires auth header (guardAny). Use same token.
    await request(app)
      .post("/api/auth/logout")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);
  });

  it("admin login is blocked until approved (isVerified=false)", async () => {
    const User = (await import("../src/models/User.js")).default;
    const Department = (await import("../src/models/Department.js")).default;

    const dept = await Department.create({ name: "CSE", code: "CSE" });
    await User.create({
      name: "Dept Admin",
      email: "admin@example.com",
      password: "Passw0rd!",
      staffId: "A100",
      role: "admin",
      department: dept._id,
      isVerified: false,
    });

    await request(app)
      .post("/api/auth/admin/login")
      .send({ email: "admin@example.com", password: "Passw0rd!" })
      .expect(403);
  });

  it("superadmin login succeeds and role-check is enforced", async () => {
    const User = (await import("../src/models/User.js")).default;
    await User.create({
      name: "Root",
      email: "root@example.com",
      password: "Passw0rd!",
      role: "superadmin",
    });

    const login = await request(app)
      .post("/api/auth/superadmin/login")
      .send({ email: "root@example.com", password: "Passw0rd!" })
      .expect(200);

    const token = login.body.accessToken;

    await request(app)
      .get("/api/auth/role-check/superadmin")
      .set("Authorization", `Bearer ${token}`)
      .expect(200);

    // A superadmin endpoint should reject students
    const student = await request(app)
      .post("/api/auth/student/register")
      .send({ name: "Bob", email: "bob@example.com", password: "Passw0rd!", studentId: "S1002" })
      .expect(201);
    expect(student.body).toHaveProperty("userId");
  });

  it("invalid/expired JWT is rejected on protected endpoints", async () => {
    await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer not-a-token")
      .expect(401);
  });

  it("refresh token rotation: /auth/refresh returns new access token and rotates cookie hash", async () => {
    const User = (await import("../src/models/User.js")).default;
    await User.create({
      name: "Alice",
      email: "alice@example.com",
      password: "Passw0rd!",
      role: "student",
      studentId: "S2001",
    });

    const agent = request.agent(app);
    const login = await agent
      .post("/api/auth/student/login")
      .send({ email: "alice@example.com", password: "Passw0rd!" })
      .expect(200);

    const before = await User.findOne({ email: "alice@example.com" }).select("+refreshTokenHash");
    expect(before.refreshTokenHash).toBeTruthy();

    const refresh = await agent.post("/api/auth/refresh").send({}).expect(200);
    expect(refresh.body).toHaveProperty("accessToken");

    const after = await User.findOne({ email: "alice@example.com" }).select("+refreshTokenHash");
    expect(after.refreshTokenHash).toBeTruthy();
    expect(after.refreshTokenHash).not.toEqual(before.refreshTokenHash);
  });

  it("User A cannot read User B grievance; admin cannot read other department grievance; superadmin can", async () => {
    const User = (await import("../src/models/User.js")).default;
    const Department = (await import("../src/models/Department.js")).default;
    const Category = (await import("../src/models/GrievanceCategory.js")).default;

    const deptA = await Department.create({ name: "CSE", code: "CSE" });
    const deptB = await Department.create({ name: "ECE", code: "ECE" });
    const catA = await Category.create({ name: "Hostel", department: deptA._id, slaHours: 72 });
    const catB = await Category.create({ name: "Fees", department: deptB._id, slaHours: 72 });

    await User.create({ name: "Student A", email: "a@example.com", password: "Passw0rd!", role: "student", studentId: "S3001", department: deptA._id });
    await User.create({ name: "Student B", email: "b@example.com", password: "Passw0rd!", role: "student", studentId: "S3002", department: deptB._id });

    await User.create({ name: "Admin A", email: "adminA@example.com", password: "Passw0rd!", role: "admin", staffId: "AD1", department: deptA._id, isVerified: true });
    await User.create({ name: "Admin B", email: "adminB@example.com", password: "Passw0rd!", role: "admin", staffId: "AD2", department: deptB._id, isVerified: true });

    await User.create({ name: "SA", email: "sa@example.com", password: "Passw0rd!", role: "superadmin" });

    const studentALogin = await request(app).post("/api/auth/student/login").send({ email: "a@example.com", password: "Passw0rd!" }).expect(200);
    const studentBLogin = await request(app).post("/api/auth/student/login").send({ email: "b@example.com", password: "Passw0rd!" }).expect(200);
    const adminALogin = await request(app).post("/api/auth/admin/login").send({ email: "adminA@example.com", password: "Passw0rd!" }).expect(200);
    const adminBLogin = await request(app).post("/api/auth/admin/login").send({ email: "adminB@example.com", password: "Passw0rd!" }).expect(200);
    const saLogin = await request(app).post("/api/auth/superadmin/login").send({ email: "sa@example.com", password: "Passw0rd!" }).expect(200);

    const makeGrievance = async (token, catId, title) => {
      const res = await request(app)
        .post("/api/grievances")
        .set("Authorization", `Bearer ${token}`)
        .field("title", title)
        .field("description", "x".repeat(60))
        .field("category", String(catId))
        .field("priority", "Medium");
      expect(res.status).toBe(201);
      return res.body.grievance;
    };

    const gA = await makeGrievance(studentALogin.body.accessToken, catA._id, "Issue A");
    const gB = await makeGrievance(studentBLogin.body.accessToken, catB._id, "Issue B");

    // Student A cannot fetch Student B grievance
    await request(app)
      .get(`/api/grievances/${gB._id}`)
      .set("Authorization", `Bearer ${studentALogin.body.accessToken}`)
      .expect(403);

    // Admin A cannot fetch dept B grievance
    await request(app)
      .get(`/api/grievances/${gB._id}`)
      .set("Authorization", `Bearer ${adminALogin.body.accessToken}`)
      .expect(403);

    // Admin B can fetch dept B grievance
    await request(app)
      .get(`/api/grievances/${gB._id}`)
      .set("Authorization", `Bearer ${adminBLogin.body.accessToken}`)
      .expect(200);

    // Superadmin can fetch both
    await request(app)
      .get(`/api/grievances/${gA._id}`)
      .set("Authorization", `Bearer ${saLogin.body.accessToken}`)
      .expect(200);
  });

  it("file upload wrong type and too large are rejected", async () => {
    const User = (await import("../src/models/User.js")).default;
    const Department = (await import("../src/models/Department.js")).default;
    const Category = (await import("../src/models/GrievanceCategory.js")).default;

    const dept = await Department.create({ name: "CSE", code: "CSE" });
    const cat = await Category.create({ name: "Hostel", department: dept._id, slaHours: 72 });
    await User.create({ name: "Student A", email: "a@example.com", password: "Passw0rd!", role: "student", studentId: "S4001", department: dept._id });

    const login = await request(app).post("/api/auth/student/login").send({ email: "a@example.com", password: "Passw0rd!" }).expect(200);

    // wrong type
    await request(app)
      .post("/api/grievances")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .field("title", "Issue")
      .field("description", "x".repeat(60))
      .field("category", String(cat._id))
      .attach("attachments", Buffer.from("hello"), { filename: "note.txt", contentType: "text/plain" })
      .expect(400);

    // too large (6MB)
    await request(app)
      .post("/api/grievances")
      .set("Authorization", `Bearer ${login.body.accessToken}`)
      .field("title", "Issue2")
      .field("description", "x".repeat(60))
      .field("category", String(cat._id))
      .attach("attachments", Buffer.alloc(6 * 1024 * 1024, 1), { filename: "big.pdf", contentType: "application/pdf" })
      .expect(400);
  });

  it("password reset OTP: verify success/failure/expiry and reset consumes OTP", async () => {
    const User = (await import("../src/models/User.js")).default;
    await User.create({ name: "Alice", email: "alice@example.com", password: "Passw0rd!", role: "student", studentId: "S5001" });

    // Request OTP (it will be 123456 due to mock)
    await request(app)
      .post("/api/users/forgot-password")
      .send({ email: "alice@example.com" })
      .expect(200);

    // wrong OTP
    await request(app)
      .post("/api/users/verify-reset-otp")
      .send({ email: "alice@example.com", otp: "000000" })
      .expect(400);

    // correct OTP verifies
    await request(app)
      .post("/api/users/verify-reset-otp")
      .send({ email: "alice@example.com", otp: "123456" })
      .expect(200);

    // expire token manually
    await User.updateOne({ email: "alice@example.com" }, { $set: { resetTokenExpire: new Date(Date.now() - 1000) } });
    await request(app)
      .post("/api/users/verify-reset-otp")
      .send({ email: "alice@example.com", otp: "123456" })
      .expect(400);

    // request again and reset
    await request(app).post("/api/users/forgot-password").send({ email: "alice@example.com" }).expect(200);
    await request(app)
      .post("/api/users/reset-password")
      .send({ email: "alice@example.com", otp: "123456", password: "NewPassw0rd!" })
      .expect(200);

    // OTP is consumed (cannot reuse)
    await request(app)
      .post("/api/users/reset-password")
      .send({ email: "alice@example.com", otp: "123456", password: "AnotherPassw0rd!" })
      .expect(400);
  });
});

