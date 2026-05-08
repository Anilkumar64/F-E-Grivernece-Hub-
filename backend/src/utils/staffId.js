const STAFF_ID_PREFIX = "ADM";

const normalizeDepartmentCode = (rawCode) => {
    const cleaned = String(rawCode || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
    return cleaned || "GEN";
};

const buildStaffId = (departmentCode, sequence) =>
    `${STAFF_ID_PREFIX}-${departmentCode}-${String(sequence).padStart(4, "0")}`;

export const generateDepartmentStaffId = async (UserModel, rawDepartmentCode) => {
    const departmentCode = normalizeDepartmentCode(rawDepartmentCode);
    const regex = new RegExp(`^${STAFF_ID_PREFIX}-${departmentCode}-(\\d+)$`);

    const existing = await UserModel.find({
        staffId: { $regex: `^${STAFF_ID_PREFIX}-${departmentCode}-` },
    }).select("staffId").lean();

    let maxSequence = 0;
    existing.forEach((user) => {
        const value = String(user.staffId || "");
        const match = value.match(regex);
        if (!match) return;
        const sequence = Number(match[1]);
        if (Number.isFinite(sequence) && sequence > maxSequence) maxSequence = sequence;
    });

    let nextSequence = maxSequence + 1;
    for (let attempts = 0; attempts < 20; attempts += 1) {
        const candidate = buildStaffId(departmentCode, nextSequence);
        const exists = await UserModel.exists({ staffId: candidate });
        if (!exists) return candidate;
        nextSequence += 1;
    }

    throw new Error("Unable to generate unique department staff ID. Please try again.");
};

