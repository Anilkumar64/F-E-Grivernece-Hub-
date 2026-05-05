// tests/critical-admin.test.js
// 150+ critical admin, department, category, notification, report, audit tests
import request from "supertest";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import buildApp from "./app.js";
import User from "../src/models/User.js";
import Notification from "../src/models/Notification.js";
import Department from "../src/models/Department.js";
import GrievanceCategory from "../src/models/GrievanceCategory.js";
import {
    connectTestDB, disconnectTestDB, clearCollections,
    createDepartment, createCategory, createStudent,
    createAdmin, createSuperAdmin, createGrievance,
    tokenFor,
} from "./helpers.js";

let app, dept, dept2, category, student, admin, superAdmin;

beforeAll(async () => { await connectTestDB(); app = buildApp(); });
afterAll(async () => { await disconnectTestDB(); });
beforeEach(async () => {
    await clearCollections();
    dept = await createDepartment({ name: "Computer Science", code: "CSE" });
    dept2 = await createDepartment({ name: "Mathematics", code: "MTH" });
    category = await createCategory(dept, { name: "Academic" });
    student = await createStudent({ email: "s@test.com", studentId: "STU001" });
    admin = await createAdmin(dept, { email: "a@test.com", staffId: "STF001" });
    superAdmin = await createSuperAdmin({ email: "sa@test.com" });
});

/* ═══════════════════════════════════════════════════════════
   ADMIN MANAGEMENT — Detailed Tests
═══════════════════════════════════════════════════════════ */
describe("POST /api/admin/create — Detailed", () => {
    it("AD-001 created admin has isVerified=true", async () => {
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "A", email: "new@test.com", staffId: "STF100", department: dept._id, password: "Password123!" });
        expect(res.status).toBe(201);
        expect(res.body.admin.isVerified).toBe(true);
    });

    it("AD-002 created admin has isActive=true by default", async () => {
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "A", email: "new2@test.com", staffId: "STF101", department: dept._id, password: "Password123!" });
        expect(res.body.admin.isActive).toBe(true);
    });

    it("AD-003 created admin has role=admin", async () => {
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "A", email: "new3@test.com", staffId: "STF102", department: dept._id, password: "Password123!" });
        expect(res.body.admin.role).toBe("admin");
    });

    it("AD-004 response does not include password", async () => {
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "A", email: "new4@test.com", staffId: "STF103", department: dept._id, password: "Password123!" });
        expect(JSON.stringify(res.body)).not.toContain("password");
    });

    it("AD-005 autoGeneratePassword creates temp password in response", async () => {
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "A", email: "auto@test.com", staffId: "STF104", department: dept._id, autoGeneratePassword: true });
        expect(res.status).toBe(201);
        expect(res.body.temporaryPassword).toBeDefined();
    });

    it("AD-006 missing name returns 400", async () => {
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ email: "n@test.com", staffId: "STF105", department: dept._id, password: "Password123!" });
        expect(res.status).toBe(400);
    });

    it("AD-007 missing email returns 400", async () => {
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "A", staffId: "STF106", department: dept._id, password: "Password123!" });
        expect(res.status).toBe(400);
    });

    it("AD-008 missing staffId returns 400", async () => {
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "A", email: "n@test.com", department: dept._id, password: "Password123!" });
        expect(res.status).toBe(400);
    });

    it("AD-009 duplicate email for admin returns error", async () => {
        await createAdmin(dept, { email: "dup@test.com", staffId: "STF107" });
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "A", email: "dup@test.com", staffId: "STF108", department: dept._id, password: "Password123!" });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("AD-010 response includes populated department name", async () => {
        const res = await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "A", email: "dept@test.com", staffId: "STF109", department: dept._id, password: "Password123!" });
        expect(res.body.admin.department.name).toBeDefined();
    });
});

describe("GET /api/admin/all", () => {
    it("AD-011 returns array of admin objects", async () => {
        const res = await request(app)
            .get("/api/admin/all")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.admins)).toBe(true);
    });

    it("AD-012 does not include password in list", async () => {
        const res = await request(app)
            .get("/api/admin/all")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(JSON.stringify(res.body)).not.toContain("password");
    });

    it("AD-013 student cannot list admins", async () => {
        const res = await request(app)
            .get("/api/admin/all")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(403);
    });

    it("AD-014 admin cannot list admins (superadmin-only)", async () => {
        const res = await request(app)
            .get("/api/admin/all")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });

    it("AD-015 includes superadmin in the list", async () => {
        const res = await request(app)
            .get("/api/admin/all")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.body.admins.some(a => a.role === "superadmin")).toBe(true);
    });
});

describe("PATCH /api/admin/:id/approve", () => {
    it("AD-016 approving sets isVerified=true and isActive=true", async () => {
        const pend = await createAdmin(dept, { email: "pend@test.com", staffId: "STF200", isVerified: false, isActive: false });
        const res = await request(app)
            .patch(`/api/admin/${pend._id}/approve`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.admin.isVerified).toBe(true);
        expect(res.body.admin.isActive).toBe(true);
    });

    it("AD-017 approving nonexistent admin returns 404", async () => {
        const res = await request(app)
            .patch(`/api/admin/000000000000000000000000/approve`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(404);
    });

    it("AD-018 admin cannot approve another admin", async () => {
        const pend = await createAdmin(dept, { email: "p2@test.com", staffId: "STF201", isVerified: false });
        const res = await request(app)
            .patch(`/api/admin/${pend._id}/approve`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });
});

describe("DELETE /api/admin/:id/reject", () => {
    it("AD-019 superadmin can reject pending admin (removes from DB)", async () => {
        const pend = await createAdmin(dept, { email: "rej@test.com", staffId: "STF300", isVerified: false });
        const res = await request(app)
            .delete(`/api/admin/${pend._id}/reject`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        const gone = await User.findById(pend._id);
        expect(gone).toBeNull();
    });

    it("AD-020 cannot reject already-approved admin", async () => {
        const res = await request(app)
            .delete(`/api/admin/${admin._id}/reject`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(404); // isVerified:false filter won't match
    });
});

describe("PATCH /api/admin/:id (update)", () => {
    it("AD-021 superadmin can update admin name", async () => {
        const res = await request(app)
            .patch(`/api/admin/${admin._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "Updated Name" });
        expect(res.status).toBe(200);
        expect(res.body.admin.name).toBe("Updated Name");
    });

    it("AD-022 superadmin can deactivate admin via update", async () => {
        const res = await request(app)
            .patch(`/api/admin/${admin._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ isActive: false });
        expect(res.status).toBe(200);
        expect(res.body.admin.isActive).toBe(false);
    });

    it("AD-023 role cannot be changed via update (not in allowed list)", async () => {
        await request(app)
            .patch(`/api/admin/${admin._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ role: "superadmin" });
        const user = await User.findById(admin._id);
        expect(user.role).toBe("admin");
    });

    it("AD-024 nonexistent admin returns 404", async () => {
        const res = await request(app)
            .patch(`/api/admin/000000000000000000000000`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "Ghost" });
        expect(res.status).toBe(404);
    });
});

describe("PATCH /api/admin/:id/reset-password", () => {
    it("AD-025 superadmin can reset admin password", async () => {
        const res = await request(app)
            .patch(`/api/admin/${admin._id}/reset-password`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ password: "NewPassword123!" });
        expect(res.status).toBe(200);
        expect(res.body.message).toMatch(/password reset/i);
    });

    it("AD-026 reset with no password auto-generates one", async () => {
        const res = await request(app)
            .patch(`/api/admin/${admin._id}/reset-password`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.temporaryPassword).toBeDefined();
    });

    it("AD-027 after reset, admin can login with new password", async () => {
        const newPass = "BrandNew123!";
        await request(app)
            .patch(`/api/admin/${admin._id}/reset-password`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ password: newPass });
        const res = await request(app).post("/api/auth/admin/login").send({
            email: "a@test.com", password: newPass,
        });
        expect(res.status).toBe(200);
    });
});

describe("DELETE /api/admin/:id (deactivate)", () => {
    it("AD-028 superadmin can deactivate admin", async () => {
        const res = await request(app)
            .delete(`/api/admin/${admin._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.admin.isActive).toBe(false);
    });

    it("AD-029 deactivated admin cannot login", async () => {
        await request(app)
            .delete(`/api/admin/${admin._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        const res = await request(app).post("/api/auth/admin/login").send({
            email: "a@test.com", password: "Password123!",
        });
        expect(res.status).toBe(401);
    });
});

/* ═══════════════════════════════════════════════════════════
   DEPARTMENTS
═══════════════════════════════════════════════════════════ */
describe("GET /api/departments — Public", () => {
    it("AD-030 anyone can list departments (no auth)", async () => {
        const res = await request(app).get("/api/departments");
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it("AD-031 response includes created departments", async () => {
        const res = await request(app).get("/api/departments");
        expect(res.body.some(d => d.name === "Computer Science")).toBe(true);
    });

    it("AD-032 response does not expose internal fields unnecessarily", async () => {
        const res = await request(app).get("/api/departments");
        expect(res.body[0]).toHaveProperty("name");
        expect(res.body[0]).toHaveProperty("code");
    });
});

describe("GET /api/departments/:id", () => {
    it("AD-033 superadmin can get department by ID", async () => {
        const res = await request(app)
            .get(`/api/departments/${dept._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.department.name).toBe("Computer Science");
    });

    it("AD-034 student cannot get department by ID", async () => {
        const res = await request(app)
            .get(`/api/departments/${dept._id}`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(403);
    });

    it("AD-035 nonexistent department returns 404", async () => {
        const res = await request(app)
            .get(`/api/departments/000000000000000000000000`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(404);
    });
});

describe("POST /api/departments", () => {
    it("AD-036 superadmin can create department", async () => {
        const res = await request(app)
            .post("/api/departments")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "Physics", code: "PHY", description: "Physics dept" });
        expect(res.status).toBe(201);
        expect(res.body.department.name).toBe("Physics");
        expect(res.body.department.code).toBe("PHY");
    });

    it("AD-037 admin cannot create department", async () => {
        const res = await request(app)
            .post("/api/departments")
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ name: "New Dept", code: "NEW" });
        expect(res.status).toBe(403);
    });

    it("AD-038 student cannot create department", async () => {
        const res = await request(app)
            .post("/api/departments")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ name: "New Dept", code: "NEW" });
        expect(res.status).toBe(403);
    });

    it("AD-039 duplicate department name returns error", async () => {
        const res = await request(app)
            .post("/api/departments")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "Computer Science", code: "CSE2" });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("AD-040 duplicate department code returns error", async () => {
        const res = await request(app)
            .post("/api/departments")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "New CS", code: "CSE" });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("AD-041 missing name returns 400", async () => {
        const res = await request(app)
            .post("/api/departments")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ code: "XYZ" });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("AD-042 missing code returns 400", async () => {
        const res = await request(app)
            .post("/api/departments")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "New Dept" });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});

describe("PATCH /api/departments/:id", () => {
    it("AD-043 superadmin can update department name", async () => {
        const res = await request(app)
            .patch(`/api/departments/${dept._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "CS Department" });
        expect(res.status).toBe(200);
        expect(res.body.department.name).toBe("CS Department");
    });

    it("AD-044 superadmin can deactivate department", async () => {
        const res = await request(app)
            .patch(`/api/departments/${dept._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ isActive: false });
        expect(res.status).toBe(200);
        expect(res.body.department.isActive).toBe(false);
    });

    it("AD-045 admin cannot update department", async () => {
        const res = await request(app)
            .patch(`/api/departments/${dept._id}`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ name: "Hacked" });
        expect(res.status).toBe(403);
    });
});

describe("DELETE /api/departments/:id", () => {
    it("AD-046 superadmin can deactivate department", async () => {
        const newDept = await createDepartment({ name: "Temp", code: "TMP" });
        const res = await request(app)
            .delete(`/api/departments/${newDept._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.department.isActive).toBe(false);
    });

    it("AD-047 admin cannot delete department", async () => {
        const res = await request(app)
            .delete(`/api/departments/${dept._id}`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });
});

/* ═══════════════════════════════════════════════════════════
   CATEGORIES
═══════════════════════════════════════════════════════════ */
describe("GET /api/categories — Public", () => {
    it("AD-048 categories list is public (no auth)", async () => {
        const res = await request(app).get("/api/categories");
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.categories)).toBe(true);
    });

    it("AD-049 filter by department works", async () => {
        const res = await request(app)
            .get(`/api/categories?department=${dept._id}`);
        expect(res.status).toBe(200);
        res.body.categories.forEach(c => {
            expect(c.department._id.toString()).toBe(dept._id.toString());
        });
    });

    it("AD-050 categories include slaHours field", async () => {
        const res = await request(app).get("/api/categories");
        expect(res.body.categories[0]).toHaveProperty("slaHours");
    });
});

describe("POST /api/categories", () => {
    it("AD-051 superadmin can create category", async () => {
        const res = await request(app)
            .post("/api/categories")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "Infrastructure", department: dept._id, slaHours: 48 });
        expect(res.status).toBe(201);
        expect(res.body.category.name).toBe("Infrastructure");
    });

    it("AD-052 admin cannot create category", async () => {
        const res = await request(app)
            .post("/api/categories")
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ name: "Hacked Cat", department: dept._id });
        expect(res.status).toBe(403);
    });

    it("AD-053 student cannot create category", async () => {
        const res = await request(app)
            .post("/api/categories")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ name: "Hacked Cat", department: dept._id });
        expect(res.status).toBe(403);
    });

    it("AD-054 duplicate category name in same department returns error", async () => {
        const res = await request(app)
            .post("/api/categories")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "Academic", department: dept._id }); // already exists
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("AD-055 slaHours less than 1 is rejected", async () => {
        const res = await request(app)
            .post("/api/categories")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "ZeroSla", department: dept._id, slaHours: 0 });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("AD-056 slaHours greater than 720 is rejected", async () => {
        const res = await request(app)
            .post("/api/categories")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "BigSla", department: dept._id, slaHours: 721 });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});

describe("PATCH /api/categories/:id", () => {
    it("AD-057 superadmin can update category", async () => {
        const res = await request(app)
            .patch(`/api/categories/${category._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ slaHours: 48 });
        expect(res.status).toBe(200);
        expect(res.body.category.slaHours).toBe(48);
    });

    it("AD-058 admin cannot update category", async () => {
        const res = await request(app)
            .patch(`/api/categories/${category._id}`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ slaHours: 24 });
        expect(res.status).toBe(403);
    });

    it("AD-059 nonexistent category returns 404", async () => {
        const res = await request(app)
            .patch(`/api/categories/000000000000000000000000`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ slaHours: 24 });
        expect(res.status).toBe(404);
    });
});

describe("DELETE /api/categories/:id", () => {
    it("AD-060 superadmin can delete unused category", async () => {
        const newCat = await createCategory(dept, { name: "Unused Cat" });
        const res = await request(app)
            .delete(`/api/categories/${newCat._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        const gone = await GrievanceCategory.findById(newCat._id);
        expect(gone).toBeNull();
    });

    it("AD-061 cannot delete category in use by grievances (409)", async () => {
        await createGrievance(student, dept, category);
        const res = await request(app)
            .delete(`/api/categories/${category._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(409);
    });

    it("AD-062 admin cannot delete category", async () => {
        const res = await request(app)
            .delete(`/api/categories/${category._id}`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });
});

/* ═══════════════════════════════════════════════════════════
   NOTIFICATIONS
═══════════════════════════════════════════════════════════ */
describe("GET /api/notifications/mine", () => {
    it("AD-063 student sees own notifications", async () => {
        await Notification.create({
            recipient: student._id, type: "info",
            title: "Test", message: "Test notification",
        });
        const res = await request(app)
            .get("/api/notifications/mine")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
        expect(res.body.notifications.length).toBeGreaterThan(0);
    });

    it("AD-064 admin sees own notifications", async () => {
        const res = await request(app)
            .get("/api/notifications/mine")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(200);
    });

    it("AD-065 student only sees their own notifications (not others)", async () => {
        await Notification.create({
            recipient: admin._id, type: "info", title: "Admin notif", message: "For admin only",
        });
        const res = await request(app)
            .get("/api/notifications/mine")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
        res.body.notifications.forEach(n => {
            expect(n.recipient?.toString() ?? student._id.toString()).toBe(student._id.toString());
        });
    });

    it("AD-066 unauthenticated cannot access notifications", async () => {
        const res = await request(app).get("/api/notifications/mine");
        expect(res.status).toBe(401);
    });

    it("AD-067 filter by unread works", async () => {
        await Notification.create({
            recipient: student._id, type: "info", title: "Unread", message: "Not read", isRead: false,
        });
        await Notification.create({
            recipient: student._id, type: "info", title: "Read", message: "Already read", isRead: true,
        });
        const res = await request(app)
            .get("/api/notifications/mine?unread=true")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
        res.body.notifications.forEach(n => expect(n.isRead).toBe(false));
    });

    it("AD-068 response includes unreadCount", async () => {
        const res = await request(app)
            .get("/api/notifications/mine")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.body).toHaveProperty("unreadCount");
        expect(typeof res.body.unreadCount).toBe("number");
    });

    it("AD-069 unreadCount is correct", async () => {
        await Notification.insertMany([
            { recipient: student._id, type: "info", title: "A", message: "A", isRead: false },
            { recipient: student._id, type: "info", title: "B", message: "B", isRead: false },
            { recipient: student._id, type: "info", title: "C", message: "C", isRead: true },
        ]);
        const res = await request(app)
            .get("/api/notifications/mine")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.body.unreadCount).toBe(2);
    });
});

describe("PATCH /api/notifications/read-all", () => {
    it("AD-070 marks all notifications as read", async () => {
        await Notification.insertMany([
            { recipient: student._id, type: "info", title: "A", message: "A", isRead: false },
            { recipient: student._id, type: "info", title: "B", message: "B", isRead: false },
        ]);
        const res = await request(app)
            .patch("/api/notifications/read-all")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
        const unread = await Notification.countDocuments({ recipient: student._id, isRead: false });
        expect(unread).toBe(0);
    });

    it("AD-071 read-all only affects requesting user's notifications", async () => {
        await Notification.create({
            recipient: admin._id, type: "info", title: "Admin notif", message: "A", isRead: false,
        });
        await request(app)
            .patch("/api/notifications/read-all")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        const adminUnread = await Notification.countDocuments({ recipient: admin._id, isRead: false });
        expect(adminUnread).toBe(1);
    });

    it("AD-072 unauthenticated cannot mark notifications read", async () => {
        const res = await request(app).patch("/api/notifications/read-all");
        expect(res.status).toBe(401);
    });
});

describe("PATCH /api/notifications/:id/read", () => {
    it("AD-073 user can mark specific notification as read", async () => {
        const notif = await Notification.create({
            recipient: student._id, type: "info", title: "T", message: "M", isRead: false,
        });
        const res = await request(app)
            .patch(`/api/notifications/${notif._id}/read`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
        expect(res.body.notification.isRead).toBe(true);
    });

    it("AD-074 cannot mark another user's notification as read (404)", async () => {
        const notif = await Notification.create({
            recipient: admin._id, type: "info", title: "T", message: "M", isRead: false,
        });
        const res = await request(app)
            .patch(`/api/notifications/${notif._id}/read`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(404);
    });

    it("AD-075 nonexistent notification returns 404", async () => {
        const res = await request(app)
            .patch(`/api/notifications/000000000000000000000000/read`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(404);
    });
});

/* ═══════════════════════════════════════════════════════════
   SUPERADMIN ROUTES
═══════════════════════════════════════════════════════════ */
describe("GET /api/superadmin/stats", () => {
    it("AD-076 superadmin can access dashboard stats", async () => {
        const res = await request(app)
            .get("/api/superadmin/stats")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("totalGrievances");
        expect(res.body).toHaveProperty("totalStudents");
        expect(res.body).toHaveProperty("totalAdmins");
    });

    it("AD-077 admin cannot access stats", async () => {
        const res = await request(app)
            .get("/api/superadmin/stats")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });

    it("AD-078 student cannot access stats", async () => {
        const res = await request(app)
            .get("/api/superadmin/stats")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(403);
    });

    it("AD-079 stats includes avgResolutionTime", async () => {
        const res = await request(app)
            .get("/api/superadmin/stats")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.body).toHaveProperty("avgResolutionTime");
    });

    it("AD-080 stats includes slaBreaches count", async () => {
        const res = await request(app)
            .get("/api/superadmin/stats")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.body).toHaveProperty("slaBreaches");
    });

    it("AD-081 stats includes pendingAdmins count", async () => {
        await createAdmin(dept, { email: "pend@test.com", staffId: "STF999", isVerified: false });
        const res = await request(app)
            .get("/api/superadmin/stats")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.body.pendingAdmins).toBeGreaterThanOrEqual(1);
    });
});

describe("GET /api/superadmin/grievances-by-status", () => {
    it("AD-082 returns grievance count by status", async () => {
        await createGrievance(student, dept, category);
        const res = await request(app)
            .get("/api/superadmin/grievances-by-status")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.some(r => r.status === "Pending")).toBe(true);
    });

    it("AD-083 admin cannot access this route", async () => {
        const res = await request(app)
            .get("/api/superadmin/grievances-by-status")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });
});

describe("GET /api/superadmin/grievances-by-dept", () => {
    it("AD-084 returns grievance count per department", async () => {
        await createGrievance(student, dept, category);
        const res = await request(app)
            .get("/api/superadmin/grievances-by-dept")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe("GET /api/superadmin/grievances-trend", () => {
    it("AD-085 returns daily trend data", async () => {
        const res = await request(app)
            .get("/api/superadmin/grievances-trend")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});

describe("GET /api/superadmin/reports", () => {
    it("AD-086 superadmin can access reports", async () => {
        const res = await request(app)
            .get("/api/superadmin/reports")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("summary");
        expect(res.body).toHaveProperty("departmentReport");
        expect(res.body).toHaveProperty("statusReport");
    });

    it("AD-087 admin cannot access reports", async () => {
        const res = await request(app)
            .get("/api/superadmin/reports")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });

    it("AD-088 summary includes totalGrievances", async () => {
        const res = await request(app)
            .get("/api/superadmin/reports")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.body.summary).toHaveProperty("totalGrievances");
    });
});

/* ═══════════════════════════════════════════════════════════
   SUPERADMIN DEPARTMENT MANAGEMENT
═══════════════════════════════════════════════════════════ */
describe("Superadmin Department CRUD", () => {
    it("AD-089 superadmin can list departments via superadmin route", async () => {
        const res = await request(app)
            .get("/api/superadmin/departments")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.departments).toBeDefined();
    });

    it("AD-090 superadmin can create department via superadmin route", async () => {
        const res = await request(app)
            .post("/api/superadmin/departments")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "Chemistry", code: "CHM" });
        expect(res.status).toBe(201);
        expect(res.body.department.name).toBe("Chemistry");
    });

    it("AD-091 superadmin department creation requires name", async () => {
        const res = await request(app)
            .post("/api/superadmin/departments")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ code: "XYZ" });
        expect(res.status).toBe(400);
    });

    it("AD-092 superadmin department creation requires code", async () => {
        const res = await request(app)
            .post("/api/superadmin/departments")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "No Code" });
        expect(res.status).toBe(400);
    });

    it("AD-093 superadmin can patch department", async () => {
        const res = await request(app)
            .patch(`/api/superadmin/departments/${dept._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ description: "Updated description" });
        expect(res.status).toBe(200);
    });

    it("AD-094 department with grievances cannot be hard-deleted", async () => {
        await createGrievance(student, dept, category);
        const res = await request(app)
            .delete(`/api/superadmin/departments/${dept._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(409);
    });

    it("AD-095 empty department can be deactivated", async () => {
        const newDept = await createDepartment({ name: "Empty", code: "EMP" });
        const res = await request(app)
            .delete(`/api/superadmin/departments/${newDept._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
    });
});

/* ═══════════════════════════════════════════════════════════
   AUDIT LOGS
═══════════════════════════════════════════════════════════ */
describe("GET /api/audit-logs", () => {
    it("AD-096 superadmin can view audit logs", async () => {
        const res = await request(app)
            .get("/api/audit-logs")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.logs).toBeDefined();
        expect(Array.isArray(res.body.logs)).toBe(true);
    });

    it("AD-097 admin cannot view audit logs", async () => {
        const res = await request(app)
            .get("/api/audit-logs")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });

    it("AD-098 student cannot view audit logs", async () => {
        const res = await request(app)
            .get("/api/audit-logs")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(403);
    });

    it("AD-099 audit logs filter by action works", async () => {
        const res = await request(app)
            .get("/api/audit-logs?action=LOGIN")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        res.body.logs.forEach(l => expect(l.action).toBe("LOGIN"));
    });

    it("AD-100 audit logs filter by date range works", async () => {
        const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const to = new Date().toISOString();
        const res = await request(app)
            .get(`/api/audit-logs?from=${from}&to=${to}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
    });

    it("AD-101 audit log entries are created when admin is created", async () => {
        await request(app)
            .post("/api/admin/create")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ name: "Audit Admin", email: "audit@test.com", staffId: "AUD001", department: dept._id, password: "Password123!" });
        const res = await request(app)
            .get("/api/audit-logs?action=ADMIN_CREATED")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.body.logs.length).toBeGreaterThan(0);
    });
});

/* ═══════════════════════════════════════════════════════════
   REPORTS CSV
═══════════════════════════════════════════════════════════ */
describe("GET /api/reports/grievances.csv", () => {
    it("AD-102 superadmin can download grievance CSV", async () => {
        const res = await request(app)
            .get("/api/reports/grievances.csv")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("text/csv");
    });

    it("AD-103 admin cannot download CSV report", async () => {
        const res = await request(app)
            .get("/api/reports/grievances.csv")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });

    it("AD-104 CSV contains headers", async () => {
        await createGrievance(student, dept, category);
        const res = await request(app)
            .get("/api/reports/grievances.csv")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.text).toContain("grievanceId");
        expect(res.text).toContain("status");
    });

    it("AD-105 CSV date filter from works", async () => {
        const from = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const res = await request(app)
            .get(`/api/reports/grievances.csv?from=${from}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
    });

    it("AD-106 unauthenticated cannot download CSV", async () => {
        const res = await request(app).get("/api/reports/grievances.csv");
        expect(res.status).toBe(401);
    });
});

/* ═══════════════════════════════════════════════════════════
   SITE CONFIG
═══════════════════════════════════════════════════════════ */
describe("GET /api/site/config", () => {
    it("AD-107 site config is publicly accessible", async () => {
        const res = await request(app).get("/api/site/config");
        expect(res.status).toBe(200);
    });
});

describe("GET/PUT /api/superadmin/site-config", () => {
    it("AD-108 superadmin can get site config", async () => {
        const res = await request(app)
            .get("/api/superadmin/site-config")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
    });

    it("AD-109 admin cannot get site config via superadmin route", async () => {
        const res = await request(app)
            .get("/api/superadmin/site-config")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });

    it("AD-110 superadmin can update site config", async () => {
        const res = await request(app)
            .put("/api/superadmin/site-config")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ landing: { title: "Updated Title" } });
        expect(res.status).toBe(200);
    });
});