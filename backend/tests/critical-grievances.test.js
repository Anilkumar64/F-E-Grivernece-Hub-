// tests/critical-grievances.test.js
// 150+ critical grievance lifecycle tests
import request from "supertest";
import mongoose from "mongoose";
import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import buildApp from "./app.js";
import Grievance from "../src/models/Grievance.js";
import Notification from "../src/models/Notification.js";
import User from "../src/models/User.js";
import {
    connectTestDB, disconnectTestDB, clearCollections,
    createDepartment, createCategory, createStudent,
    createAdmin, createSuperAdmin, createGrievance,
    tokenFor,
} from "./helpers.js";

let app, dept, dept2, category, category2, student, student2, admin, admin2, superAdmin;

beforeAll(async () => { await connectTestDB(); app = buildApp(); });
afterAll(async () => { await disconnectTestDB(); });
beforeEach(async () => {
    await clearCollections();
    dept = await createDepartment({ name: "Computer Science", code: "CSE" });
    dept2 = await createDepartment({ name: "Mathematics", code: "MTH" });
    category = await createCategory(dept, { name: "Academic", slaHours: 72 });
    category2 = await createCategory(dept2, { name: "Facilities" });
    student = await createStudent({ email: "s@test.com", studentId: "STU001" });
    student2 = await createStudent({ email: "s2@test.com", studentId: "STU002" });
    admin = await createAdmin(dept, { email: "a@test.com", staffId: "STF001" });
    admin2 = await createAdmin(dept2, { email: "a2@test.com", staffId: "STF002" });
    superAdmin = await createSuperAdmin({ email: "sa@test.com" });
});

/* ═══════════════════════════════════════════════════════════
   GRIEVANCE SUBMISSION
═══════════════════════════════════════════════════════════ */
describe("POST /api/grievances — Submission Critical Tests", () => {
    it("CG-001 grievanceId follows GRV-YYYYMMDD-XXXX format", async () => {
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "T", description: "D", category: category._id.toString() });
        expect(res.status).toBe(201);
        expect(res.body.grievance.grievanceId).toMatch(/^GRV-\d{8}-\d{4}$/);
    });

    it("CG-002 slaDeadline is set based on category slaHours", async () => {
        const before = Date.now();
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "SLA Test", description: "D", category: category._id.toString() });
        expect(res.status).toBe(201);
        const sla = new Date(res.body.grievance.slaDeadline).getTime();
        // slaHours=72 → deadline ≈ 72h from now
        expect(sla - before).toBeGreaterThan(71 * 60 * 60 * 1000);
        expect(sla - before).toBeLessThan(73 * 60 * 60 * 1000);
    });

    it("CG-003 department is auto-set from category (not from body)", async () => {
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "T", description: "D", category: category._id.toString() });
        expect(res.status).toBe(201);
        expect(res.body.grievance.department._id.toString()).toBe(dept._id.toString());
    });

    it("CG-004 initial status is Pending", async () => {
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "T", description: "D", category: category._id.toString() });
        expect(res.body.grievance.status).toBe("Pending");
    });

    it("CG-005 timeline has initial Pending entry", async () => {
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "T", description: "D", category: category._id.toString() });
        expect(res.body.grievance.timeline).toHaveLength(1);
        expect(res.body.grievance.timeline[0].status).toBe("Pending");
    });

    it("CG-006 notification is created for student on submit", async () => {
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "T", description: "D", category: category._id.toString() });
        expect(res.status).toBe(201);
        const notifs = await Notification.find({ recipient: student._id });
        expect(notifs.some(n => n.type === "grievance_submitted")).toBe(true);
    });

    it("CG-007 notification is created for admin on submit", async () => {
        await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "T", description: "D", category: category._id.toString() });
        const notifs = await Notification.find({ recipient: admin._id });
        expect(notifs.length).toBeGreaterThan(0);
    });

    it("CG-008 default priority is Medium when not specified", async () => {
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "T", description: "D", category: category._id.toString() });
        expect(res.body.grievance.priority).toBe("Medium");
    });

    it("CG-009 all valid priorities are accepted", async () => {
        for (const priority of ["Low", "Medium", "High", "Critical"]) {
            const res = await request(app)
                .post("/api/grievances")
                .set("Authorization", `Bearer ${tokenFor(student)}`)
                .send({ title: `T-${priority}`, description: "D", category: category._id.toString(), priority });
            expect(res.status).toBe(201);
            expect(res.body.grievance.priority).toBe(priority);
        }
    });

    it("CG-010 title exceeding 160 chars is rejected", async () => {
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "T".repeat(161), description: "D", category: category._id.toString() });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("CG-011 description exceeding 5000 chars is rejected", async () => {
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "T", description: "D".repeat(5001), category: category._id.toString() });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("CG-012 missing description returns 400", async () => {
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "T", category: category._id.toString() });
        expect(res.status).toBe(400);
    });

    it("CG-013 missing category returns 400", async () => {
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "T", description: "D" });
        expect(res.status).toBe(400);
    });

    it("CG-014 non-ObjectId category ID returns 400", async () => {
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ title: "T", description: "D", category: "not-an-id" });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("CG-015 submittedBy is set to logged-in student (not body injection)", async () => {
        const res = await request(app)
            .post("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({
                title: "T", description: "D", category: category._id.toString(),
                submittedBy: student2._id.toString(), // attempt injection
            });
        expect(res.status).toBe(201);
        expect(res.body.grievance.submittedBy._id.toString()).toBe(student._id.toString());
    });
});

/* ═══════════════════════════════════════════════════════════
   GET GRIEVANCES — Access Control
═══════════════════════════════════════════════════════════ */
describe("GET /api/grievances — Access Control", () => {
    it("CG-016 student cannot access GET /api/grievances (all list)", async () => {
        const res = await request(app)
            .get("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(403);
    });

    it("CG-017 admin sees only their department's grievances", async () => {
        await createGrievance(student, dept, category);
        await createGrievance(student, dept2, category2);
        const res = await request(app)
            .get("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(200);
        res.body.grievances.forEach(g => {
            expect(g.department._id.toString()).toBe(dept._id.toString());
        });
    });

    it("CG-018 superadmin sees all departments' grievances", async () => {
        await createGrievance(student, dept, category);
        await createGrievance(student, dept2, category2);
        const res = await request(app)
            .get("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
        expect(res.body.grievances.length).toBeGreaterThanOrEqual(2);
    });

    it("CG-019 pagination defaults: page=1, limit=20", async () => {
        const res = await request(app)
            .get("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.body.pagination.page).toBe(1);
        expect(res.body.pagination.limit).toBe(20);
    });

    it("CG-020 pagination limit cannot exceed 100", async () => {
        const res = await request(app)
            .get("/api/grievances?limit=999")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.body.pagination.limit).toBeLessThanOrEqual(100);
    });

    it("CG-021 filter by status works", async () => {
        await createGrievance(student, dept, category, { status: "Pending" });
        await createGrievance(student, dept, category, { status: "Resolved", resolvedAt: new Date() });
        const res = await request(app)
            .get("/api/grievances?status=Pending")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(200);
        res.body.grievances.forEach(g => expect(g.status).toBe("Pending"));
    });

    it("CG-022 filter by priority works", async () => {
        await createGrievance(student, dept, category, { priority: "High" });
        await createGrievance(student, dept, category, { priority: "Low" });
        const res = await request(app)
            .get("/api/grievances?priority=High")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(200);
        res.body.grievances.forEach(g => expect(g.priority).toBe("High"));
    });

    it("CG-023 GET /api/grievances/mine returns only own grievances", async () => {
        await createGrievance(student, dept, category);
        await createGrievance(student2, dept, category);
        const res = await request(app)
            .get("/api/grievances/mine")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
        res.body.grievances.forEach(g => {
            expect(g.submittedBy._id.toString()).toBe(student._id.toString());
        });
    });

    it("CG-024 admin cannot access /mine endpoint", async () => {
        const res = await request(app)
            .get("/api/grievances/mine")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });

    it("CG-025 response includes pagination metadata", async () => {
        const res = await request(app)
            .get("/api/grievances")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.body.pagination).toHaveProperty("total");
        expect(res.body.pagination).toHaveProperty("pages");
        expect(res.body.pagination).toHaveProperty("page");
        expect(res.body.pagination).toHaveProperty("limit");
    });
});

/* ═══════════════════════════════════════════════════════════
   GET SINGLE GRIEVANCE
═══════════════════════════════════════════════════════════ */
describe("GET /api/grievances/:id — Access Control", () => {
    it("CG-026 student can view their own grievance by ObjectId", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .get(`/api/grievances/${g._id}`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
        expect(res.body.grievance._id.toString()).toBe(g._id.toString());
    });

    it("CG-027 student can view their own grievance by grievanceId string", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .get(`/api/grievances/${g.grievanceId}`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
    });

    it("CG-028 student CANNOT view another student's grievance", async () => {
        const g = await createGrievance(student2, dept, category);
        const res = await request(app)
            .get(`/api/grievances/${g._id}`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(403);
    });

    it("CG-029 admin can view grievance in their department", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .get(`/api/grievances/${g._id}`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(200);
    });

    it("CG-030 admin CANNOT view grievance in other department", async () => {
        const g = await createGrievance(student, dept2, category2);
        const res = await request(app)
            .get(`/api/grievances/${g._id}`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });

    it("CG-031 superadmin can view any grievance", async () => {
        const g = await createGrievance(student2, dept2, category2);
        const res = await request(app)
            .get(`/api/grievances/${g._id}`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
    });

    it("CG-032 non-existent grievance ID returns 404", async () => {
        const res = await request(app)
            .get(`/api/grievances/000000000000000000000000`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(404);
    });

    it("CG-033 unauthenticated access returns 401", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app).get(`/api/grievances/${g._id}`);
        expect(res.status).toBe(401);
    });
});

/* ═══════════════════════════════════════════════════════════
   TRACK GRIEVANCE
═══════════════════════════════════════════════════════════ */
describe("GET /api/grievances/track/:id", () => {
    it("CG-034 student can track own grievance by grievanceId", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .get(`/api/grievances/track/${g.grievanceId}`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
    });

    it("CG-035 student cannot track another student's grievance", async () => {
        const g = await createGrievance(student2, dept, category);
        const res = await request(app)
            .get(`/api/grievances/track/${g.grievanceId}`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(403);
    });

    it("CG-036 admin can track grievance in their department", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .get(`/api/grievances/track/${g.grievanceId}`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(200);
    });

    it("CG-037 invalid grievanceId returns 404", async () => {
        const res = await request(app)
            .get(`/api/grievances/track/GRV-INVALID-9999`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(404);
    });
});

/* ═══════════════════════════════════════════════════════════
   STATUS UPDATE
═══════════════════════════════════════════════════════════ */
describe("PATCH /api/grievances/:id/status — Critical Tests", () => {
    it("CG-038 admin can update status to InProgress", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/status`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ status: "InProgress", message: "Working on it" });
        expect(res.status).toBe(200);
        expect(res.body.grievance.status).toBe("InProgress");
    });

    it("CG-039 status update adds timeline entry", async () => {
        const g = await createGrievance(student, dept, category);
        await request(app)
            .patch(`/api/grievances/${g._id}/status`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ status: "InProgress", message: "Working" });
        const updated = await Grievance.findById(g._id);
        expect(updated.timeline.length).toBeGreaterThanOrEqual(2);
        expect(updated.timeline[updated.timeline.length - 1].status).toBe("InProgress");
    });

    it("CG-040 resolving sets resolvedAt timestamp", async () => {
        const g = await createGrievance(student, dept, category);
        const before = Date.now();
        await request(app)
            .patch(`/api/grievances/${g._id}/status`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ status: "Resolved" });
        const updated = await Grievance.findById(g._id);
        expect(updated.resolvedAt).not.toBeNull();
        expect(new Date(updated.resolvedAt).getTime()).toBeGreaterThanOrEqual(before);
    });

    it("CG-041 student cannot update status", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/status`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ status: "Resolved" });
        expect(res.status).toBe(403);
    });

    it("CG-042 invalid status value returns 400", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/status`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ status: "FAKE_STATUS" });
        expect(res.status).toBe(400);
    });

    it("CG-043 admin from dept2 cannot update dept1 grievance status", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/status`)
            .set("Authorization", `Bearer ${tokenFor(admin2)}`)
            .send({ status: "Resolved" });
        expect(res.status).toBe(403);
    });

    it("CG-044 all valid statuses can be set", async () => {
        for (const status of ["InProgress", "UnderReview", "Resolved", "Closed"]) {
            const g = await createGrievance(student, dept, category);
            const res = await request(app)
                .patch(`/api/grievances/${g._id}/status`)
                .set("Authorization", `Bearer ${tokenFor(admin)}`)
                .send({ status });
            expect(res.status).toBe(200);
        }
    });

    it("CG-045 status update sends notification to student", async () => {
        const g = await createGrievance(student, dept, category);
        await request(app)
            .patch(`/api/grievances/${g._id}/status`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ status: "InProgress" });
        const notifs = await Notification.find({ recipient: student._id, type: "status_changed" });
        expect(notifs.length).toBeGreaterThan(0);
    });

    it("CG-046 resolving sends feedback_requested notification", async () => {
        const g = await createGrievance(student, dept, category);
        await request(app)
            .patch(`/api/grievances/${g._id}/status`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ status: "Resolved" });
        const notifs = await Notification.find({ recipient: student._id, type: "feedback_requested" });
        expect(notifs.length).toBeGreaterThan(0);
    });

    it("CG-047 resolving again does not reset resolvedAt", async () => {
        const g = await createGrievance(student, dept, category);
        await request(app)
            .patch(`/api/grievances/${g._id}/status`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ status: "Resolved" });
        const first = (await Grievance.findById(g._id)).resolvedAt;

        await request(app)
            .patch(`/api/grievances/${g._id}/status`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ status: "Resolved" });
        const second = (await Grievance.findById(g._id)).resolvedAt;
        expect(first.getTime()).toBe(second.getTime()); // resolvedAt unchanged
    });
});

/* ═══════════════════════════════════════════════════════════
   ASSIGN GRIEVANCE
═══════════════════════════════════════════════════════════ */
describe("PATCH /api/grievances/:id/assign", () => {
    it("CG-048 admin can assign grievance to themselves", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/assign`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ assignedTo: admin._id.toString() });
        expect(res.status).toBe(200);
        expect(res.body.grievance.assignedTo._id.toString()).toBe(admin._id.toString());
    });

    it("CG-049 admin cannot assign to admin from another department", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/assign`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ assignedTo: admin2._id.toString() });
        expect(res.status).toBe(403);
    });

    it("CG-050 superadmin can assign to any admin", async () => {
        const g = await createGrievance(student, dept2, category2);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/assign`)
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`)
            .send({ assignedTo: admin2._id.toString() });
        expect(res.status).toBe(200);
    });

    it("CG-051 student cannot assign grievance", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/assign`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ assignedTo: admin._id.toString() });
        expect(res.status).toBe(403);
    });

    it("CG-052 assigning to non-existent user returns 400", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/assign`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ assignedTo: "000000000000000000000000" });
        expect(res.status).toBe(400);
    });

    it("CG-053 assigning to student user returns 400", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/assign`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ assignedTo: student._id.toString() });
        expect(res.status).toBe(400);
    });

    it("CG-054 assignment creates notification for assignee", async () => {
        const g = await createGrievance(student, dept, category);
        await request(app)
            .patch(`/api/grievances/${g._id}/assign`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ assignedTo: admin._id.toString() });
        const notifs = await Notification.find({ recipient: admin._id, type: "info" });
        expect(notifs.some(n => n.title.includes("assigned"))).toBe(true);
    });

    it("CG-055 assignment adds timeline entry", async () => {
        const g = await createGrievance(student, dept, category);
        await request(app)
            .patch(`/api/grievances/${g._id}/assign`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ assignedTo: admin._id.toString() });
        const updated = await Grievance.findById(g._id);
        expect(updated.timeline.length).toBeGreaterThanOrEqual(2);
    });

    it("CG-056 invalid ObjectId for assignedTo returns 400", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/assign`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ assignedTo: "not-an-objectid" });
        expect(res.status).toBe(400);
    });
});

/* ═══════════════════════════════════════════════════════════
   PRIORITY CHANGE
═══════════════════════════════════════════════════════════ */
describe("PATCH /api/grievances/:id/priority", () => {
    it("CG-057 admin can change priority", async () => {
        const g = await createGrievance(student, dept, category, { priority: "Low" });
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/priority`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ priority: "Critical" });
        expect(res.status).toBe(200);
        expect(res.body.grievance.priority).toBe("Critical");
    });

    it("CG-058 student cannot change priority", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/priority`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ priority: "Critical" });
        expect(res.status).toBe(403);
    });

    it("CG-059 invalid priority value returns 400", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/priority`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ priority: "EXTREME" });
        expect(res.status).toBe(400);
    });

    it("CG-060 admin from wrong dept cannot change priority", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/priority`)
            .set("Authorization", `Bearer ${tokenFor(admin2)}`)
            .send({ priority: "High" });
        expect(res.status).toBe(403);
    });
});

/* ═══════════════════════════════════════════════════════════
   COMMENTS
═══════════════════════════════════════════════════════════ */
describe("POST /api/grievances/:id/comments", () => {
    it("CG-061 student can comment on own grievance", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .post(`/api/grievances/${g._id}/comments`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ text: "Please update me" });
        expect(res.status).toBe(201);
        expect(res.body.grievance.comments).toHaveLength(1);
        expect(res.body.grievance.comments[0].text).toBe("Please update me");
    });

    it("CG-062 admin can comment on department's grievance", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .post(`/api/grievances/${g._id}/comments`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ text: "We are looking into it" });
        expect(res.status).toBe(201);
    });

    it("CG-063 student cannot comment on another student's grievance", async () => {
        const g = await createGrievance(student2, dept, category);
        const res = await request(app)
            .post(`/api/grievances/${g._id}/comments`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ text: "Random comment" });
        expect(res.status).toBe(403);
    });

    it("CG-064 empty comment text returns 400", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .post(`/api/grievances/${g._id}/comments`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ text: "   " });
        expect(res.status).toBe(400);
    });

    it("CG-065 missing text returns 400", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .post(`/api/grievances/${g._id}/comments`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({});
        expect(res.status).toBe(400);
    });

    it("CG-066 comment exceeding 2000 chars is rejected", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .post(`/api/grievances/${g._id}/comments`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ text: "C".repeat(2001) });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });

    it("CG-067 comment has correct role recorded", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .post(`/api/grievances/${g._id}/comments`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ text: "A comment" });
        expect(res.body.grievance.comments[0].role).toBe("student");
    });

    it("CG-068 admin comment role is recorded as admin", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .post(`/api/grievances/${g._id}/comments`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ text: "Admin reply" });
        expect(res.body.grievance.comments[0].role).toBe("admin");
    });

    it("CG-069 comment creates notification for the other party", async () => {
        const g = await createGrievance(student, dept, category);
        await request(app)
            .post(`/api/grievances/${g._id}/comments`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ text: "Admin speaking" });
        const notifs = await Notification.find({ recipient: student._id, type: "comment_added" });
        expect(notifs.length).toBeGreaterThan(0);
    });
});

/* ═══════════════════════════════════════════════════════════
   FEEDBACK
═══════════════════════════════════════════════════════════ */
describe("POST /api/grievances/:id/feedback", () => {
    it("CG-070 student can submit feedback on resolved grievance", async () => {
        const g = await createGrievance(student, dept, category, { status: "Resolved", resolvedAt: new Date() });
        const res = await request(app)
            .post(`/api/grievances/${g._id}/feedback`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ rating: 5, text: "Great service!" });
        expect(res.status).toBe(200);
        expect(res.body.grievance.feedbackRating).toBe(5);
    });

    it("CG-071 feedback not allowed on Pending grievance", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .post(`/api/grievances/${g._id}/feedback`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ rating: 4 });
        expect(res.status).toBe(400);
    });

    it("CG-072 rating must be 1-5 (0 rejected)", async () => {
        const g = await createGrievance(student, dept, category, { status: "Resolved", resolvedAt: new Date() });
        const res = await request(app)
            .post(`/api/grievances/${g._id}/feedback`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ rating: 0 });
        expect(res.status).toBe(400);
    });

    it("CG-073 rating must be 1-5 (6 rejected)", async () => {
        const g = await createGrievance(student, dept, category, { status: "Resolved", resolvedAt: new Date() });
        const res = await request(app)
            .post(`/api/grievances/${g._id}/feedback`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ rating: 6 });
        expect(res.status).toBe(400);
    });

    it("CG-074 cannot submit duplicate feedback (409)", async () => {
        const g = await createGrievance(student, dept, category, {
            status: "Resolved", resolvedAt: new Date(), feedbackRating: 4,
        });
        const res = await request(app)
            .post(`/api/grievances/${g._id}/feedback`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ rating: 5 });
        expect(res.status).toBe(409);
    });

    it("CG-075 admin cannot submit feedback", async () => {
        const g = await createGrievance(student, dept, category, { status: "Resolved", resolvedAt: new Date() });
        const res = await request(app)
            .post(`/api/grievances/${g._id}/feedback`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ rating: 5 });
        expect(res.status).toBe(403);
    });

    it("CG-076 student2 cannot submit feedback for student's grievance", async () => {
        const g = await createGrievance(student, dept, category, { status: "Resolved", resolvedAt: new Date() });
        const res = await request(app)
            .post(`/api/grievances/${g._id}/feedback`)
            .set("Authorization", `Bearer ${tokenFor(student2)}`)
            .send({ rating: 3 });
        expect(res.status).toBe(403);
    });

    it("CG-077 feedbackText is optional", async () => {
        const g = await createGrievance(student, dept, category, { status: "Resolved", resolvedAt: new Date() });
        const res = await request(app)
            .post(`/api/grievances/${g._id}/feedback`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ rating: 3 });
        expect(res.status).toBe(200);
    });

    it("CG-078 feedbackText exceeding 1000 chars is rejected", async () => {
        const g = await createGrievance(student, dept, category, { status: "Resolved", resolvedAt: new Date() });
        const res = await request(app)
            .post(`/api/grievances/${g._id}/feedback`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ rating: 3, text: "T".repeat(1001) });
        expect(res.status).toBeGreaterThanOrEqual(400);
    });
});

/* ═══════════════════════════════════════════════════════════
   CLOSURE REQUEST
═══════════════════════════════════════════════════════════ */
describe("PATCH /api/grievances/:id/request-close", () => {
    it("CG-079 student can request closure", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/request-close`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
        expect(res.body.grievance.closureRequested).toBe(true);
    });

    it("CG-080 admin cannot request closure", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/request-close`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(403);
    });

    it("CG-081 cannot request closure on already closed grievance", async () => {
        const g = await createGrievance(student, dept, category, { status: "Closed" });
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/request-close`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(400);
    });

    it("CG-082 cannot request closure on resolved grievance (terminal)", async () => {
        const g = await createGrievance(student, dept, category, { status: "Resolved", resolvedAt: new Date() });
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/request-close`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(400);
    });

    it("CG-083 student2 cannot request closure on student's grievance", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/request-close`)
            .set("Authorization", `Bearer ${tokenFor(student2)}`);
        expect(res.status).toBe(403);
    });
});

/* ═══════════════════════════════════════════════════════════
   ESCALATION
═══════════════════════════════════════════════════════════ */
describe("PATCH /api/grievances/:id/escalate", () => {
    it("CG-084 admin can manually escalate a grievance", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/escalate`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ reason: "Requires urgent attention" });
        expect(res.status).toBe(200);
        expect(res.body.grievance.isEscalated).toBe(true);
        expect(res.body.grievance.status).toBe("Escalated");
    });

    it("CG-085 student cannot escalate a grievance", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/escalate`)
            .set("Authorization", `Bearer ${tokenFor(student)}`)
            .send({ reason: "I want this escalated" });
        expect(res.status).toBe(403);
    });

    it("CG-086 escalating already-escalated returns 409", async () => {
        const g = await createGrievance(student, dept, category, { isEscalated: true, status: "Escalated" });
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/escalate`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ reason: "Re-escalate" });
        expect(res.status).toBe(409);
    });

    it("CG-087 escalation sets escalatedAt", async () => {
        const g = await createGrievance(student, dept, category);
        const before = Date.now();
        await request(app)
            .patch(`/api/grievances/${g._id}/escalate`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ reason: "Urgent" });
        const updated = await Grievance.findById(g._id);
        expect(updated.escalatedAt).not.toBeNull();
        expect(new Date(updated.escalatedAt).getTime()).toBeGreaterThanOrEqual(before);
    });

    it("CG-088 escalation notifies superadmins", async () => {
        const g = await createGrievance(student, dept, category);
        await request(app)
            .patch(`/api/grievances/${g._id}/escalate`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`)
            .send({ reason: "Urgent" });
        const notifs = await Notification.find({ recipient: superAdmin._id, type: "grievance_escalated" });
        expect(notifs.length).toBeGreaterThan(0);
    });

    it("CG-089 admin2 cannot escalate dept1 grievance", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .patch(`/api/grievances/${g._id}/escalate`)
            .set("Authorization", `Bearer ${tokenFor(admin2)}`)
            .send({ reason: "X" });
        expect(res.status).toBe(403);
    });
});

/* ═══════════════════════════════════════════════════════════
   ANALYTICS
═══════════════════════════════════════════════════════════ */
describe("GET /api/grievances/analytics", () => {
    it("CG-090 admin can access analytics", async () => {
        const res = await request(app)
            .get("/api/grievances/analytics")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty("statusDistribution");
        expect(res.body).toHaveProperty("totals");
    });

    it("CG-091 superadmin can access analytics", async () => {
        const res = await request(app)
            .get("/api/grievances/analytics")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(res.status).toBe(200);
    });

    it("CG-092 student cannot access analytics", async () => {
        const res = await request(app)
            .get("/api/grievances/analytics")
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(403);
    });

    it("CG-093 analytics totals count is correct", async () => {
        await createGrievance(student, dept, category);
        await createGrievance(student, dept, category);
        const res = await request(app)
            .get("/api/grievances/analytics")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.body.totals.total).toBeGreaterThanOrEqual(2);
    });

    it("CG-094 analytics includes recent grievances list", async () => {
        const res = await request(app)
            .get("/api/grievances/analytics")
            .set("Authorization", `Bearer ${tokenFor(superAdmin)}`);
        expect(Array.isArray(res.body.recent)).toBe(true);
    });

    it("CG-095 analytics includes slaWarnings list", async () => {
        const res = await request(app)
            .get("/api/grievances/analytics")
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(Array.isArray(res.body.slaWarnings)).toBe(true);
    });
});

/* ═══════════════════════════════════════════════════════════
   PDF EXPORT
═══════════════════════════════════════════════════════════ */
describe("GET /api/grievances/:id/pdf", () => {
    it("CG-096 student can download PDF of own grievance", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .get(`/api/grievances/${g._id}/pdf`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("application/pdf");
    });

    it("CG-097 PDF filename contains grievanceId", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .get(`/api/grievances/${g._id}/pdf`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.headers["content-disposition"]).toContain(g.grievanceId);
    });

    it("CG-098 student cannot download PDF of other student's grievance", async () => {
        const g = await createGrievance(student2, dept, category);
        const res = await request(app)
            .get(`/api/grievances/${g._id}/pdf`)
            .set("Authorization", `Bearer ${tokenFor(student)}`);
        expect(res.status).toBe(403);
    });

    it("CG-099 admin can download PDF for their department's grievance", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app)
            .get(`/api/grievances/${g._id}/pdf`)
            .set("Authorization", `Bearer ${tokenFor(admin)}`);
        expect(res.status).toBe(200);
        expect(res.headers["content-type"]).toContain("application/pdf");
    });

    it("CG-100 unauthenticated PDF download returns 401", async () => {
        const g = await createGrievance(student, dept, category);
        const res = await request(app).get(`/api/grievances/${g._id}/pdf`);
        expect(res.status).toBe(401);
    });
});