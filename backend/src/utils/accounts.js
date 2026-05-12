import User from "../models/User.js";
import Admin from "../models/Admin.js";
import SuperAdmin from "../models/SuperAdmin.js";

export const accountModels = {
    student: User,
    admin: Admin,
    superadmin: SuperAdmin,
};

export const accountProjection = "-password -refreshTokenHash -resetToken -resetTokenExpire";

export const getAccountModel = (role) => accountModels[role] || null;

export const findAccountByIdAndRole = (id, role) => {
    const Model = getAccountModel(role);
    if (!Model) return null;
    return Model.findById(id);
};

export const findAccountById = async (id) => {
    for (const role of ["student", "admin", "superadmin"]) {
        const account = await accountModels[role].findById(id);
        if (account) return account;
    }
    return null;
};

export const findAccountByEmail = async (email) => {
    const normalizedEmail = email.toLowerCase().trim();
    for (const role of ["student", "admin", "superadmin"]) {
        const account = await accountModels[role].findOne({ email: normalizedEmail });
        if (account) return account;
    }
    return null;
};

export const publicAccount = (account) => ({
    _id: account._id,
    name: account.name,
    email: account.email,
    role: account.role,
    studentId: account.studentId,
    staffId: account.staffId,
    department: account.department,
    course: account.course,
    isActive: account.isActive,
    isVerified: account.isVerified,
    profilePhoto: account.profilePhoto,
    avatar: account.avatar,
});

export const findActiveSuperAdmins = (projection = "_id") =>
    SuperAdmin.find({ isActive: true }).select(projection);
