// tests/admin-superadmin-users.test.js
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import buildApp from "./app.js";
import {
    connectTestDB, disconnectTestDB, clearCollections,
    createDepartment, createCategory, createStudent,
    createAdmin, createSuperAdmin, createGrievance,
    tokenFor,
} from "./helpers.js";

let app, dept, student, admin, superAdmin;

beforeAll(async () => { await connectTestDB(); app = buildApp(); });
afterAll(async ()  => { await disconnectTestDB(); });
beforeEach(async () => {
    await clearCollections();
    dept       = await createDepartment();
    student    = await createStudent({ email: "s@test.com", studentId: "STU001" });
    admin      = await createAdmin(dept, { email: "a@test.com", staffId: "STF001" });
    superAdmin = await createSuperAdmin({ email: "sa@test.com" });
});

/* ══════════════════════════════════════════════════
   ADMIN MANAGEMENT  (superadmin only)
══════════════════════════════════════════════════ */
describe("POST /api/admin/create", () => {
    it("TC-066 superadmin creates an admin successfully", async () => {
        const dept2 = await createDepartment({ name: "EEE", code: "EEE" });
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({
                name: "New Admin", email: "newadm@test.com",
                staffId: "STF100", department: dept2._id, password: "Password123!",
            });
        expect(res.status).toBe(201);
        expect(res.body.admin.isVerified).toBe(true);
    });

    it("TC-067 student cannot create an admin", async () => {
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ name: "X", email: "x@test.com", staffId: "STF101", department: dept._id, password: "Password123!" });
        expect(res.status).toBe(403);
    });

    it("TC-068 admin cannot create another admin", async () => {
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ name: "X", email: "x@test.com", staffId: "STF101", department: dept._id, password: "Password123!" });
        expect(res.status).toBe(403);
    });

    it("TC-069 rejects creation with non-existent department", async () => {
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({
                name: "X", email: "x@test.com",
                staffId: "STF102", department: "000000000000000000000000", password: "Password123!",
            });
        expect(res.status).toBe(400);
    });
});

describe("GET /api/admin/all", () => {
    it("TC-070 superadmin lists all admins", async () => {
        const res = await request(app)
            .get("/api/admin/all")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.admins)).toBe(true);
        expect(res.body.admins.length).toBeGreaterThanOrEqual(1);
    });
});

describe("GET /api/admin/pending", () => {
    it("TC-071 returns pending (unverified) admins", async () => {
        await createAdmin(dept, { email: "pend@test.com", staffId: "STF200", isVerified: false });
        const res = await request(app)
            .get("/api/admin/pending")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.pending.some(a => a.email === "pend@test.com")).toBe(true);
    });
});

describe("PATCH /api/admin/:id/approve", () => {
    it("TC-072 superadmin approves a pending admin", async () => {
        const pending = await createAdmin(dept, { email: "app@test.com", staffId: "STF300", isVerified: false });
        const res = await request(app)
            .patch(`/api/admin/${pending._id}/approve`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.admin.isVerified).toBe(true);
    });

    it("TC-073 returns 404 for unknown admin ID on approve", async () => {
        const res = await request(app)
            .patch("/api/admin/000000000000000000000000/approve")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(404);
    });
});

describe("DELETE /api/admin/:id/reject", () => {
    it("TC-074 superadmin rejects and deletes a pending admin", async () => {
        const pending = await createAdmin(dept, { email: "rej@test.com", staffId: "STF400", isVerified: false });
        const res = await request(app)
            .delete(`/api/admin/${pending._id}/reject`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/rejected/i);
    });

    it("TC-075 cannot reject an already-verified admin", async () => {
        // Already verified admin should not be deletable via reject
        const res = await request(app)
            .delete(`/api/admin/${admin._id}/reject`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(404); // findOneAndDelete with isVerified:false won't match
    });
});

describe("PATCH /api/admin/:id (update admin)", () => {
    it("TC-076 superadmin updates admin name", async () => {
        const res = await request(app)
            .patch(`/api/admin/${admin._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "Updated Name" });
        expect(res.status).toBe(200);
        expect(res.body.admin.name).toBe("Updated Name");
    });
});

describe("PATCH /api/admin/:id/reset-password", () => {
    it("TC-077 superadmin can reset admin password", async () => {
        const res = await request(app)
            .patch(`/api/admin/${admin._id}/reset-password`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ password: "NewSecurePass123!" });
        expect(res.status).toBe(200);
        expect(res.body.temporaryPassword).toBeDefined();
    });
});

describe("DELETE /api/admin/:id (deactivate)", () => {
    it("TC-078 superadmin deactivates an admin", async () => {
        const res = await request(app)
            .delete(`/api/admin/${admin._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.admin.isActive).toBe(false);
    });
});

/* ══════════════════════════════════════════════════
   SUPERADMIN DASHBOARD
══════════════════════════════════════════════════ */
describe("GET /api/superadmin/stats", () => {
    it("TC-079 returns dashboard statistics", async () => {
        const res = await request(app)
            .get("/api/superadmin/stats")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("totalGrievances");
        expect(res.body).toHaveProperty("totalStudents");
        expect(res.body).toHaveProperty("pendingAdmins");
        expect(res.body).toHaveProperty("avgResolutionTime");
    });

    it("TC-080 student cannot access superadmin stats", async () => {
        const res = await request(app)
            .get("/api/superadmin/stats")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(403);
    });

    it("TC-081 admin cannot access superadmin stats", async () => {
        const res = await request(app)
            .get("/api/superadmin/stats")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });
});

describe("GET /api/superadmin/grievances-by-status", () => {
    it("TC-082 returns grievance count per status", async () => {
        const res = await request(app)
            .get("/api/superadmin/grievances-by-status")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe("GET /api/superadmin/grievances-trend", () => {
    it("TC-083 returns daily trend for last 30 days", async () => {
        const res = await request(app)
            .get("/api/superadmin/grievances-trend")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe("GET /api/superadmin/reports", () => {
    it("TC-084 returns full report with department and priority breakdown", async () => {
        const res = await request(app)
            .get("/api/superadmin/reports")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("summary");
        expect(res.body).toHaveProperty("departmentReport");
        expect(res.body).toHaveProperty("priorityReport");
    });
});

/* ══════════════════════════════════════════════════
   DEPARTMENTS
══════════════════════════════════════════════════ */
describe("GET /api/departments", () => {
    it("TC-085 public endpoint lists all active departments", async () => {
        const res = await request(app).get("/api/departments");
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe("POST /api/superadmin/departments", () => {
    it("TC-086 superadmin creates a department", async () => {
        const res = await request(app)
            .post("/api/superadmin/departments")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "Mechanical", code: "ME", description: "Mech dept" });
        expect(res.status).toBe(201);
        expect(res.body.department.code).toBe("ME");
    });

    it("TC-087 rejects duplicate department code", async () => {
        const res = await request(app)
            .post("/api/superadmin/departments")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "CSE Again", code: "CSE" }); // CSE already exists
        expect(res.status).toBe(409);
    });

    it("TC-088 rejects department without name", async () => {
        const res = await request(app)
            .post("/api/superadmin/departments")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ code: "XYZ" });
        expect(res.status).toBe(400);
    });
});

describe("PATCH /api/superadmin/departments/:id", () => {
    it("TC-089 superadmin updates department description", async () => {
        const res = await request(app)
            .patch(`/api/superadmin/departments/${dept._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ description: "Updated description" });
        expect(res.status).toBe(200);
        expect(res.body.department.description).toBe("Updated description");
    });
});

describe("DELETE /api/superadmin/departments/:id", () => {
    it("TC-090 superadmin deactivates an empty department", async () => {
        const emptyDept = await createDepartment({ name: "Empty", code: "EMP" });
        const res = await request(app)
            .delete(`/api/superadmin/departments/${emptyDept._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.department.isActive).toBe(false);
    });

    it("TC-091 blocks deletion of department with grievances", async () => {
        const category = await createCategory(dept);
        await createGrievance(student, dept, category);
        const res = await request(app)
            .delete(`/api/superadmin/departments/${dept._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(409);
    });
});

/* ══════════════════════════════════════════════════
   CATEGORIES
══════════════════════════════════════════════════ */
describe("GET /api/categories", () => {
    it("TC-092 lists all categories publicly", async () => {
        await createCategory(dept);
        const res = await request(app).get("/api/categories");
        expect(res.status).toBe(200);
    });
});

/* ══════════════════════════════════════════════════
   USER PROFILE & PASSWORD RESET
══════════════════════════════════════════════════ */
describe("GET /api/users/me", () => {
    it("TC-093 student accesses their profile", async () => {
        const res = await request(app)
            .get("/api/users/me")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
        expect(res.body.user.email).toBe("s@test.com");
    });

    it("TC-094 admin cannot access /api/users/me (student-only route)", async () => {
        const res = await request(app)
            .get("/api/users/me")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });
});

describe("PATCH /api/users/me", () => {
    it("TC-095 student updates their phone number", async () => {
        const res = await request(app)
            .patch("/api/users/me")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ phone: "9999999999" });
        expect(res.status).toBe(200);
        expect(res.body.user.phone).toBe("9999999999");
    });
});

describe("POST /api/users/forgot-password", () => {
    it("TC-096 always returns 200 regardless of email existence (anti-enumeration)", async () => {
        const res = await request(app)
            .post("/api/users/forgot-password")
            .send({ email: "nobody@test.com" });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/if an account exists/i);
    });

    it("TC-097 returns 400 when email field is missing", async () => {
        const res = await request(app)
            .post("/api/users/forgot-password")
            .send({});
        expect(res.status).toBe(400);
    });
});

/* ══════════════════════════════════════════════════
   NOTIFICATIONS
══════════════════════════════════════════════════ */
describe("GET /api/notifications/mine", () => {
    it("TC-098 authenticated user retrieves their notifications", async () => {
        const res = await request(app)
            .get("/api/notifications/mine")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
    });

    it("TC-099 unauthenticated request returns 401", async () => {
        const res = await request(app).get("/api/notifications/mine");
        expect(res.status).toBe(401);
    });
});

/* ══════════════════════════════════════════════════
   AUDIT LOGS
══════════════════════════════════════════════════ */
describe("GET /api/audit-logs", () => {
    it("TC-100 superadmin can access audit logs", async () => {
        const res = await request(app)
            .get("/api/audit-logs")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("logs");
    });

    it("TC-101 admin cannot access audit logs", async () => {
        const res = await request(app)
            .get("/api/audit-logs")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });

    it("TC-102 student cannot access audit logs", async () => {
        const res = await request(app)
            .get("/api/audit-logs")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(403);
    });
});

/* ══════════════════════════════════════════════════
   404 Handling
══════════════════════════════════════════════════ */
describe("Unknown routes", () => {
    it("TC-103 returns 404 for unknown route", async () => {
        const res = await request(app).get("/api/does-not-exist");
        expect(res.status).toBe(404);
    });
});

/* ══════════════════════════════════════════════════
   Site Config
══════════════════════════════════════════════════ */
describe("GET /api/superadmin/site-config", () => {
    it("TC-104 superadmin retrieves site config", async () => {
        const res = await request(app)
            .get("/api/superadmin/site-config")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
    });
});

describe("CSV Export", () => {
    it("TC-105 superadmin downloads grievances CSV", async () => {
        const category = await createCategory(dept);
        await createGrievance(student, dept, category);
        const res = await request(app)
            .get("/api/reports/grievances.csv")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toMatch(/csv/);
    });

    it("TC-106 admin cannot download CSV report", async () => {
        const res = await request(app)
            .get("/api/reports/grievances.csv")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });
});
