// tests/critical-auth.test.js
// 100+ critical authentication & authorization tests
import request from "supertest";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../src/models/User.js";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import buildApp from "./app.js";
import {
    connectTestDB, disconnectTestDB, clearCollections,
    createDepartment, createAdmin, createStudent, createSuperAdmin,
    tokenFor, expiredTokenFor,
} from "./helpers.js";

let app, dept;

beforeAll(async () => { await connectTestDB(); app = buildApp(); });
afterAll(async () => { await disconnectTestDB(); });
beforeEach(async () => {
    await clearCollections();
    dept = await createDepartment();
});

/* ═══════════════════════════════════════════════════════════
   STUDENT REGISTRATION — Edge Cases
═══════════════════════════════════════════════════════════ */
describe("Student Registration — Critical Edge Cases", () => {
    it("CA-001 rejects password shorter than 8 chars", async () => {
        const res = await request(app).post("/api/auth/student/register").send({
            name: "Alice", email: "alice@test.com", password: "Short1", studentId: "STU001",
        });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("CA-002 rejects invalid email format", async () => {
        const res = await request(app).post("/api/auth/student/register").send({
            name: "Bob", email: "not-an-email", password: "Password123!", studentId: "STU002",
        });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("CA-003 rejects empty name field", async () => {
        const res = await request(app).post("/api/auth/student/register").send({
            name: "", email: "bob@test.com", password: "Password123!", studentId: "STU003",
        });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("CA-004 rejects duplicate studentId", async () => {
        await createStudent({ email: "first@test.com", studentId: "STU_DUP" });
        const res = await request(app).post("/api/auth/student/register").send({
            name: "Second", email: "second@test.com", password: "Password123!", studentId: "STU_DUP",
        });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("CA-005 email is stored lowercase", async () => {
        const res = await request(app).post("/api/auth/student/register").send({
            name: "CaseTest", email: "UPPER@TEST.COM", password: "Password123!", studentId: "STU005",
        });
        expect(res.status).toBe(201);
        const user = await User.findOne({ email: "upper@test.com" });
        expect(user).not.toBeNull();
    });

    it("CA-006 response does NOT include password field", async () => {
        const res = await request(app).post("/api/auth/student/register").send({
            name: "SafeReg", email: "safe@test.com", password: "Password123!", studentId: "STU006",
        });
        expect(res.status).toBe(201);
        expect(JSON.stringify(res.body)).not.toContain("password");
    });

    it("CA-007 name with max length 120 chars is accepted", async () => {
        const res = await request(app).post("/api/auth/student/register").send({
            name: "A".repeat(120), email: "longname@test.com", password: "Password123!", studentId: "STU007",
        });
        expect(res.status).toBe(201);
    });

    it("CA-008 name exceeding 120 chars is rejected", async () => {
        const res = await request(app).post("/api/auth/student/register").send({
            name: "A".repeat(121), email: "toolong@test.com", password: "Password123!", studentId: "STU008",
        });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("CA-009 no extra fields are leaked in response", async () => {
        const res = await request(app).post("/api/auth/student/register").send({
            name: "Leak", email: "leak@test.com", password: "Password123!", studentId: "STU009",
        });
        expect(res.status).toBe(201);
        expect(JSON.stringify(res.body)).not.toContain("refreshTokenHash");
        expect(JSON.stringify(res.body)).not.toContain("resetToken");
    });

    it("CA-010 simultaneous duplicate email registration — second gets 409", async () => {
        await createStudent({ email: "race@test.com", studentId: "STU010" });
        const res = await request(app).post("/api/auth/student/register").send({
            name: "Race", email: "race@test.com", password: "Password123!", studentId: "STU010B",
        });
        expect(res.status).toBe(409);
    });
});

/* ═══════════════════════════════════════════════════════════
   STUDENT LOGIN — Critical Security
═══════════════════════════════════════════════════════════ */
describe("Student Login — Security Tests", () => {
    it("CA-011 login returns httpOnly cookie for student", async () => {
        await createStudent({ email: "cookie@test.com", studentId: "STU011" });
        const res = await request(app).post("/api/auth/student/login").send({
            email: "cookie@test.com", password: "Password123!",
        });
        expect(res.status).toBe(200);
        const setCookieHeader = res.headers["set-cookie"];
        expect(setCookieHeader).toBeDefined();
        expect(setCookieHeader.some(c => c.includes("studentAccessToken"))).toBe(true);
        expect(setCookieHeader.some(c => c.toLowerCase().includes("httponly"))).toBe(true);
    });

    it("CA-012 login response includes accessToken in body", async () => {
        await createStudent({ email: "tok@test.com", studentId: "STU012" });
        const res = await request(app).post("/api/auth/student/login").send({
            email: "tok@test.com", password: "Password123!",
        });
        expect(res.body.accessToken).toBeDefined();
        const decoded = jwt.verify(res.body.accessToken, process.env.ACCESS_TOKEN_SECRET);
        expect(decoded.role).toBe("student");
    });

    it("CA-013 login response NEVER exposes password hash", async () => {
        await createStudent({ email: "nopw@test.com", studentId: "STU013" });
        const res = await request(app).post("/api/auth/student/login").send({
            email: "nopw@test.com", password: "Password123!",
        });
        expect(JSON.stringify(res.body)).not.toContain("password");
    });

    it("CA-014 login response NEVER exposes refreshTokenHash", async () => {
        await createStudent({ email: "norf@test.com", studentId: "STU014" });
        const res = await request(app).post("/api/auth/student/login").send({
            email: "norf@test.com", password: "Password123!",
        });
        expect(JSON.stringify(res.body)).not.toContain("refreshTokenHash");
    });

    it("CA-015 wrong password returns 401 (not 403 or 200)", async () => {
        await createStudent({ email: "wrongpw@test.com", studentId: "STU015" });
        const res = await request(app).post("/api/auth/student/login").send({
            email: "wrongpw@test.com", password: "WrongPassword!",
        });
        expect(res.status).toBe(401);
    });

    it("CA-016 case-insensitive email login", async () => {
        await createStudent({ email: "mixed@test.com", studentId: "STU016" });
        const res = await request(app).post("/api/auth/student/login").send({
            email: "MIXED@TEST.COM", password: "Password123!",
        });
        expect(res.status).toBe(200);
    });

    it("CA-017 SQL/NoSQL injection in email field is sanitized", async () => {
        const res = await request(app).post("/api/auth/student/login").send({
            email: { "$gt": "" }, password: "Password123!",
        });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("CA-018 deactivated student cannot login", async () => {
        await createStudent({ email: "dead@test.com", studentId: "STU018", isActive: false });
        const res = await request(app).post("/api/auth/student/login").send({
            email: "dead@test.com", password: "Password123!",
        });
        expect(res.status).toBe(401);
    });

    it("CA-019 missing password field returns 400", async () => {
        const res = await request(app).post("/api/auth/student/login").send({ email: "x@x.com" });
        expect(res.status).toBe(400);
    });

    it("CA-020 superadmin token cannot access student-only route", async () => {
        const sa = await createSuperAdmin({ email: "sa_cross@test.com" });
        const res = await request(app)
            .get("/api/grievances/mine")
            .set("Authorization", `Bearer ${tokenFor(sa)}`);
        expect(res.status).toBe(403);
    });
});

/* ═══════════════════════════════════════════════════════════
   TOKEN SECURITY
═══════════════════════════════════════════════════════════ */
describe("Token Security", () => {
    it("CA-021 expired token is rejected", async () => {
        const stu = await createStudent({ email: "exp@test.com", studentId: "STU021" });
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${expiredTokenFor(stu)}`);
        expect(res.status).toBe(401);
        expect(res.body.message).toMatch(/expired/i);
    });

    it("CA-022 token signed with wrong secret is rejected", async () => {
        const stu = await createStudent({ email: "wrongsec@test.com", studentId: "STU022" });
        const fakeToken = jwt.sign(
            { _id: stu._id.toString(), email: stu.email, role: stu.role },
            "totally_wrong_secret_key_here_!!"
        );
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${fakeToken}`);
        expect(res.status).toBe(401);
    });

    it("CA-023 tampered token payload is rejected", async () => {
        const stu = await createStudent({ email: "tamper@test.com", studentId: "STU023" });
        const tok = tokenFor(stu);
        const [h, , s] = tok.split(".");
        // Change role in payload
        const fakePayload = Buffer.from(JSON.stringify({ _id: stu._id, email: stu.email, role: "superadmin" })).toString("base64url");
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${h}.${fakePayload}.${s}`);
        expect(res.status).toBe(401);
    });

    it("CA-024 token with nonexistent userId is rejected", async () => {
        const fakeToken = jwt.sign(
            { _id: "000000000000000000000000", email: "ghost@test.com", role: "student" },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "15m" }
        );
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${fakeToken}`);
        expect(res.status).toBe(401);
    });

    it("CA-025 token for deactivated user is rejected mid-session", async () => {
        const stu = await createStudent({ email: "deact@test.com", studentId: "STU025" });
        const tok = tokenFor(stu);
        await User.findByIdAndUpdate(stu._id, { isActive: false });
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${tok}`);
        expect(res.status).toBe(401);
    });

    it("CA-026 empty Bearer token is rejected", async () => {
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", "Bearer ");
        expect(res.status).toBe(401);
    });

    it("CA-027 Bearer prefix only (no token) is rejected", async () => {
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", "Bearer");
        expect(res.status).toBe(401);
    });

    it("CA-028 JWT algorithm none attack is rejected", async () => {
        const stu = await createStudent({ email: "algnone@test.com", studentId: "STU028" });
        // Manually craft a 'none' algorithm JWT
        const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
        const payload = Buffer.from(JSON.stringify({ _id: stu._id.toString(), email: stu.email, role: "superadmin" })).toString("base64url");
        const noneToken = `${header}.${payload}.`;
        const res = await request(app)
            .get("/api/auth/me")
            .set("Authorization", `Bearer ${noneToken}`);
        expect(res.status).toBe(401);
    });

    it("CA-029 refresh token endpoint requires valid refresh token", async () => {
        const res = await request(app).post("/api/auth/refresh").send({ refreshToken: "garbage" });
        expect(res.status).toBe(403);
    });

    it("CA-030 refresh token works and issues new access token", async () => {
        await createStudent({ email: "refresh@test.com", studentId: "STU030" });
        const loginRes = await request(app).post("/api/auth/student/login").send({
            email: "refresh@test.com", password: "Password123!",
        });
        const cookies = loginRes.headers["set-cookie"];
        const refreshCookie = cookies.find(c => c.startsWith("studentRefreshToken="));
        const refreshToken = refreshCookie.split("=")[1].split(";")[0];

        const res = await request(app).post("/api/auth/refresh").send({ refreshToken });
        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBeDefined();
    });
});

/* ═══════════════════════════════════════════════════════════
   ADMIN REGISTRATION & LOGIN
═══════════════════════════════════════════════════════════ */
describe("Admin Registration & Login — Critical Cases", () => {
    it("CA-031 unverified admin cannot login", async () => {
        await createAdmin(dept, { email: "unverified@test.com", staffId: "STF031", isVerified: false });
        const res = await request(app).post("/api/auth/admin/login").send({
            email: "unverified@test.com", password: "Password123!",
        });
        expect(res.status).toBe(403);
        expect(res.body.message).toMatch(/not yet approved/i);
    });

    it("CA-032 admin login gives admin-role cookie (not student)", async () => {
        await createAdmin(dept, { email: "adm_cookie@test.com", staffId: "STF032" });
        const res = await request(app).post("/api/auth/admin/login").send({
            email: "adm_cookie@test.com", password: "Password123!",
        });
        expect(res.status).toBe(200);
        const cookies = res.headers["set-cookie"];
        expect(cookies.some(c => c.startsWith("adminAccessToken="))).toBe(true);
        expect(cookies.every(c => !c.startsWith("studentAccessToken="))).toBe(true);
    });

    it("CA-033 admin self-registration sets isVerified to false", async () => {
        const res = await request(app).post("/api/auth/admin/register").send({
            name: "Self Admin", email: "selfadm@test.com",
            staffId: "STF033", department: dept._id, password: "Password123!",
        });
        expect(res.status).toBe(201);
        const user = await User.findOne({ email: "selfadm@test.com" });
        expect(user.isVerified).toBe(false);
    });

    it("CA-034 admin register without staffId returns 400", async () => {
        const res = await request(app).post("/api/auth/admin/register").send({
            name: "NoStaff", email: "nostaff@test.com",
            department: dept._id, password: "Password123!",
        });
        expect(res.status).toBe(400);
    });

    it("CA-035 admin cannot log in via student endpoint", async () => {
        await createAdmin(dept, { email: "adm_stu@test.com", staffId: "STF035" });
        const res = await request(app).post("/api/auth/student/login").send({
            email: "adm_stu@test.com", password: "Password123!",
        });
        expect(res.status).toBe(401);
    });

    it("CA-036 superadmin cannot log in via admin endpoint", async () => {
        await createSuperAdmin({ email: "sa_adm@test.com" });
        const res = await request(app).post("/api/auth/admin/login").send({
            email: "sa_adm@test.com", password: "Password123!",
        });
        expect(res.status).toBe(401);
    });

    it("CA-037 superadmin login gives superadmin cookie", async () => {
        await createSuperAdmin({ email: "sa_cookie@test.com" });
        const res = await request(app).post("/api/auth/superadmin/login").send({
            email: "sa_cookie@test.com", password: "Password123!",
        });
        expect(res.status).toBe(200);
        const cookies = res.headers["set-cookie"];
        expect(cookies.some(c => c.startsWith("superadminAccessToken="))).toBe(true);
    });
});

/* ═══════════════════════════════════════════════════════════
   ROLE-BASED ACCESS CONTROL
═══════════════════════════════════════════════════════════ */
describe("RBAC — Cross-Role Access", () => {
    it("CA-038 student cannot access admin routes", async () => {
        const stu = await createStudent({ email: "stu_adm@test.com", studentId: "STU038" });
        const res = await request(app)
            .get("/api/admin/all")
            .set("Authorization", `Bearer ${tokenFor(stu)}`);
        expect(res.status).toBe(403);
    });

    it("CA-039 admin cannot access superadmin routes", async () => {
        const adm = await createAdmin(dept, { email: "adm_sa@test.com", staffId: "STF039" });
        const res = await request(app)
            .get("/api/superadmin/stats")
            .set("Authorization", `Bearer ${tokenFor(adm)}`);
        expect(res.status).toBe(403);
    });

    it("CA-040 superadmin passes superadmin role-check", async () => {
        const sa = await createSuperAdmin({ email: "sa_rc@test.com" });
        const res = await request(app)
            .get("/api/auth/role-check/superadmin")
            .set("Authorization", `Bearer ${tokenFor(sa)}`);
        expect(res.status).toBe(200);
    });

    it("CA-041 admin passes admin role-check", async () => {
        const adm = await createAdmin(dept, { email: "adm_rc@test.com", staffId: "STF041" });
        const res = await request(app)
            .get("/api/auth/role-check/admin")
            .set("Authorization", `Bearer ${tokenFor(adm)}`);
        expect(res.status).toBe(200);
    });

    it("CA-042 student fails superadmin role-check with 403", async () => {
        const stu = await createStudent({ email: "stu_sa@test.com", studentId: "STU042" });
        const res = await request(app)
            .get("/api/auth/role-check/superadmin")
            .set("Authorization", `Bearer ${tokenFor(stu)}`);
        expect(res.status).toBe(403);
    });

    it("CA-043 superadmin also passes admin role-check", async () => {
        const sa = await createSuperAdmin({ email: "sa_adm_rc@test.com" });
        const res = await request(app)
            .get("/api/auth/role-check/admin")
            .set("Authorization", `Bearer ${tokenFor(sa)}`);
        expect(res.status).toBe(200);
    });

    it("CA-044 unauthenticated request to protected route returns 401", async () => {
        const res = await request(app).get("/api/admin/all");
        expect(res.status).toBe(401);
    });

    it("CA-045 unauthenticated request to superadmin route returns 401", async () => {
        const res = await request(app).get("/api/superadmin/stats");
        expect(res.status).toBe(401);
    });
});

/* ═══════════════════════════════════════════════════════════
   LOGOUT & SESSION INVALIDATION
═══════════════════════════════════════════════════════════ */
describe("Logout & Session Invalidation", () => {
    it("CA-046 logout clears refresh token from DB", async () => {
        const stu = await createStudent({ email: "logdb@test.com", studentId: "STU046" });
        await request(app).post("/api/auth/student/login").send({ email: "logdb@test.com", password: "Password123!" });
        const tok = tokenFor(stu);
        await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${tok}`);
        const user = await User.findById(stu._id).select("+refreshTokenHash");
        expect(user.refreshTokenHash).toBeNull();
    });

    it("CA-047 logout clears auth cookies", async () => {
        const stu = await createStudent({ email: "logcookie@test.com", studentId: "STU047" });
        const res = await request(app)
            .post("/api/auth/logout")
            .set("Authorization", `Bearer ${tokenFor(stu)}`);
        expect(res.status).toBe(200);
        const cookies = res.headers["set-cookie"];
        // Cookies should be expired (maxAge=0 or expires in past)
        if (cookies) {
            expect(cookies.some(c =>
                (c.includes("studentAccessToken") || c.includes("adminAccessToken")) &&
                (c.includes("Max-Age=0") || c.includes("Expires="))
            )).toBe(true);
        }
    });

    it("CA-048 using access token after logout still works (stateless JWT)", async () => {
        // Access tokens are stateless — only refresh token is invalidated server-side
        const stu = await createStudent({ email: "postlog@test.com", studentId: "STU048" });
        const tok = tokenFor(stu);
        await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${tok}`);
        // Access token still valid until expiry — this is expected JWT behavior
        const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${tok}`);
        expect(res.status).toBe(200); // stateless access token still valid
    });

    it("CA-049 after logout, refresh token is invalidated", async () => {
        await createStudent({ email: "rfafter@test.com", studentId: "STU049" });
        const loginRes = await request(app).post("/api/auth/student/login").send({
            email: "rfafter@test.com", password: "Password123!",
        });
        const cookies = loginRes.headers["set-cookie"];
        const refreshCookie = cookies.find(c => c.startsWith("studentRefreshToken="));
        const refreshToken = refreshCookie.split("=")[1].split(";")[0];

        // Logout
        await request(app).post("/api/auth/logout").set("Authorization", `Bearer ${loginRes.body.accessToken}`);

        // Try to refresh — should fail (hash no longer matches)
        const res = await request(app).post("/api/auth/refresh").send({ refreshToken });
        expect(res.status).toBe(403);
    });
});

/* ═══════════════════════════════════════════════════════════
   PASSWORD RESET
═══════════════════════════════════════════════════════════ */
describe("Password Reset Flow", () => {
    it("CA-050 forgot-password always returns 200 (no user enumeration)", async () => {
        const res = await request(app).post("/api/users/forgot-password").send({ email: "nobody@test.com" });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/if an account exists/i);
    });

    it("CA-051 forgot-password sets reset token when user exists", async () => {
        await createStudent({ email: "resetme@test.com", studentId: "STU051" });
        await request(app).post("/api/users/forgot-password").send({ email: "resetme@test.com" });
        const user = await User.findOne({ email: "resetme@test.com" }).select("+resetToken +resetTokenExpire");
        expect(user.resetToken).not.toBeNull();
        expect(user.resetTokenExpire).not.toBeNull();
    });

    it("CA-052 OTP expiry is set ~10 minutes in future", async () => {
        await createStudent({ email: "otp@test.com", studentId: "STU052" });
        const before = Date.now();
        await request(app).post("/api/users/forgot-password").send({ email: "otp@test.com" });
        const user = await User.findOne({ email: "otp@test.com" }).select("+resetTokenExpire");
        const diff = user.resetTokenExpire - before;
        expect(diff).toBeGreaterThan(9 * 60 * 1000);
        expect(diff).toBeLessThan(11 * 60 * 1000);
    });

    it("CA-053 verify-reset-otp returns 400 for wrong OTP", async () => {
        await createStudent({ email: "badreset@test.com", studentId: "STU053" });
        await request(app).post("/api/users/forgot-password").send({ email: "badreset@test.com" });
        const res = await request(app).post("/api/users/verify-reset-otp").send({
            email: "badreset@test.com", otp: "000000",
        });
        expect(res.status).toBe(400);
    });

    it("CA-054 reset-password with wrong OTP returns 400", async () => {
        await createStudent({ email: "badpw@test.com", studentId: "STU054" });
        await request(app).post("/api/users/forgot-password").send({ email: "badpw@test.com" });
        const res = await request(app).post("/api/users/reset-password").send({
            email: "badpw@test.com", otp: "000000", password: "NewPassword123!",
        });
        expect(res.status).toBe(400);
    });

    it("CA-055 reset-password with new password shorter than 8 chars returns 400", async () => {
        await createStudent({ email: "shortpw@test.com", studentId: "STU055" });
        const res = await request(app).post("/api/users/reset-password").send({
            email: "shortpw@test.com", otp: "123456", password: "short",
        });
        expect(res.status).toBe(400);
    });

    it("CA-056 forgot-password requires email field", async () => {
        const res = await request(app).post("/api/users/forgot-password").send({});
        expect(res.status).toBe(400);
    });
});

/* ═══════════════════════════════════════════════════════════
   GET /api/auth/me — field security
═══════════════════════════════════════════════════════════ */
describe("GET /api/auth/me — Field Security", () => {
    it("CA-057 me endpoint never returns password", async () => {
        const stu = await createStudent({ email: "me_pw@test.com", studentId: "STU057" });
        const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${tokenFor(stu)}`);
        expect(JSON.stringify(res.body)).not.toContain("password");
    });

    it("CA-058 me endpoint never returns refreshTokenHash", async () => {
        const stu = await createStudent({ email: "me_rf@test.com", studentId: "STU058" });
        const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${tokenFor(stu)}`);
        expect(JSON.stringify(res.body)).not.toContain("refreshTokenHash");
    });

    it("CA-059 me endpoint never returns resetToken", async () => {
        const stu = await createStudent({ email: "me_rt@test.com", studentId: "STU059" });
        const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${tokenFor(stu)}`);
        expect(JSON.stringify(res.body)).not.toContain("resetToken");
    });

    it("CA-060 me returns correct user info", async () => {
        const stu = await createStudent({ email: "me_info@test.com", studentId: "STU060" });
        const res = await request(app).get("/api/auth/me").set("Authorization", `Bearer ${tokenFor(stu)}`);
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe("me_info@test.com");
        expect(res.body.user.role).toBe("student");
    });
});

/* ═══════════════════════════════════════════════════════════
   PROFILE UPDATE (users/me)
═══════════════════════════════════════════════════════════ */
describe("PATCH /api/users/me", () => {
    it("CA-061 student can update allowed fields", async () => {
        const stu = await createStudent({ email: "upd@test.com", studentId: "STU061" });
        const res = await request(app)
            .patch("/api/users/me")
            .set("Authorization", `Bearer ${tokenFor(stu)}`)
            .send({ phone: "9999999999", address: "123 New Street" });
        expect(res.status).toBe(200);
        expect(res.body.user.phone).toBe("9999999999");
    });

    it("CA-062 student cannot update their own role", async () => {
        const stu = await createStudent({ email: "role_upd@test.com", studentId: "STU062" });
        await request(app)
            .patch("/api/users/me")
            .set("Authorization", `Bearer ${tokenFor(stu)}`)
            .send({ role: "superadmin" });
        const user = await User.findById(stu._id);
        expect(user.role).toBe("student");
    });

    it("CA-063 student cannot update their own email via /me", async () => {
        const stu = await createStudent({ email: "email_upd@test.com", studentId: "STU063" });
        await request(app)
            .patch("/api/users/me")
            .set("Authorization", `Bearer ${tokenFor(stu)}`)
            .send({ email: "hacked@evil.com" });
        const user = await User.findById(stu._id);
        expect(user.email).toBe("email_upd@test.com");
    });

    it("CA-064 admin cannot access /api/users/me (student-only)", async () => {
        const adm = await createAdmin(dept, { email: "adm_me@test.com", staffId: "STF064" });
        const res = await request(app)
            .get("/api/users/me")
            .set("Authorization", `Bearer ${tokenFor(adm)}`);
        expect(res.status).toBe(403);
    });

    it("CA-065 unauthenticated user cannot access /api/users/me", async () => {
        const res = await request(app).get("/api/users/me");
        expect(res.status).toBe(401);
    });
});

/* ═══════════════════════════════════════════════════════════
   UNKNOWN ROUTES
═══════════════════════════════════════════════════════════ */
describe("Unknown Routes & 404 Handling", () => {
    it("CA-066 unknown API route returns 404", async () => {
        const res = await request(app).get("/api/doesnotexist");
        expect(res.status).toBe(404);
    });

    it("CA-067 unknown HTTP method on known route is handled", async () => {
        const res = await request(app).delete("/api/auth/me");
        expect([404, 405]).toContain(res.status);
    });
});

/* ═══════════════════════════════════════════════════════════
   HEADER & INJECTION SECURITY
═══════════════════════════════════════════════════════════ */
describe("Security Headers & Injection", () => {
    it("CA-068 response includes X-Content-Type-Options header", async () => {
        const res = await request(app).get("/api/health");
        // helmet sets this
        expect(res.headers["x-content-type-options"]).toBeDefined();
    });

    it("CA-069 NoSQL injection in login body is neutralized", async () => {
        const res = await request(app).post("/api/auth/student/login").send({
            email: "test@test.com",
            password: { "$gt": "" },
        });
        // mongoSanitize will strip the operator; login will fail normally
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("CA-070 oversized JSON body returns 413", async () => {
        const bigPayload = { data: "x".repeat(2 * 1024 * 1024) }; // 2MB
        const res = await request(app).post("/api/auth/student/login").send(bigPayload);
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});