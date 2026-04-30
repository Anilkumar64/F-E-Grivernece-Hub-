/**
 * Application-wide constants for grievance management system
 */

export const GRIEVANCE_STATUS = {
    SUBMITTED: "submitted",
    IN_PROGRESS: "in_progress",
    RESOLVED: "resolved",
    REJECTED: "rejected",
};

export const GRIEVANCE_PRIORITY = {
    LOW: "low",
    MEDIUM: "medium",
    HIGH: "high",
    CRITICAL: "critical",
};

export const USER_ROLES = {
    STUDENT: "student",
    STAFF: "staff",
    ADMIN: "admin",
    DEPARTMENT_ADMIN: "departmentadmin",
    SUPERADMIN: "superadmin",
};

export const HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    INTERNAL_SERVER_ERROR: 500,
};

// Status order for timeline
export const STATUS_PROGRESSION = [
    GRIEVANCE_STATUS.SUBMITTED,
    GRIEVANCE_STATUS.IN_PROGRESS,
    GRIEVANCE_STATUS.RESOLVED,
];

// Valid status transitions
export const VALID_STATUS_TRANSITIONS = {
    [GRIEVANCE_STATUS.SUBMITTED]: [GRIEVANCE_STATUS.IN_PROGRESS, GRIEVANCE_STATUS.REJECTED],
    [GRIEVANCE_STATUS.IN_PROGRESS]: [GRIEVANCE_STATUS.RESOLVED, GRIEVANCE_STATUS.REJECTED],
    [GRIEVANCE_STATUS.RESOLVED]: [],
    [GRIEVANCE_STATUS.REJECTED]: [],
};

export default {
    GRIEVANCE_STATUS,
    GRIEVANCE_PRIORITY,
    USER_ROLES,
    HTTP_STATUS,
    STATUS_PROGRESSION,
    VALID_STATUS_TRANSITIONS,
};
