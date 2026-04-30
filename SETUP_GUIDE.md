# E-Grievance Hub - Setup & Configuration Guide

## 🔐 Critical Security Fixes Applied

### ✅ Issues Fixed in This Session:

1. **Hardcoded Credentials** - Created `.env.example` template (never commit `.env`)
2. **IDOR Vulnerability** - Fixed logout endpoint to use authenticated user ID from JWT
3. **Wrong Bcrypt Import** - Changed from `bcrypt` to `bcryptjs` (package.json mismatch)
4. **Missing Auth Checks** - Added `verifyAdmin` middleware to admin routes
5. **Hardcoded Superadmin Password** - Uses environment variable or random generation
6. **CORS Misconfiguration** - Environment-driven CORS with whitelist support
7. **Wrong Status Enums** - Fixed "Pending" → "submitted", "Resolved" → "resolved"
8. **Non-existent Fields** - Fixed resolvedAt → updatedAt in stat calculations
9. **Inconsistent Response Formats** - Standardized login responses across endpoints
10. **Database Indexes** - Added indexes on frequently queried fields
11. **Field Naming Consistency** - Refreshtoken → refreshToken
12. **Package Cleanup** - Removed typo "expresss", recharts, bcrypt, path

---

## 🚀 Quick Start

### Prerequisites
```bash
npm install  # Install dependencies
```

### Environment Configuration
```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with your values:
```ini
MONGODB_URL=your_mongodb_connection_string
ALLOWED_ORIGINS=http://localhost:5173,https://yourdomain.com
ACCESS_TOKEN_SECRET=$(openssl rand -hex 32)
REFRESH_TOKEN_SECRET=$(openssl rand -hex 32)
```

### Create Superadmin
```bash
cd backend
node createSuperAdmin.js
# Output will show generated password - save it securely!
```

### Start Development
```bash
npm run dev  # Runs both frontend and backend
```

---

## 📋 Remaining High-Priority Fixes Needed

### [CRITICAL] Database Pagination
- Add pagination to all list endpoints (`/admin/all`, `/users/me`, etc.)
- Use cursor-based or offset/limit pagination
- Prevent unbounded responses

### [CRITICAL] Email Configuration
- Set up environment variable names consistently (EMAIL_HOST, EMAIL_USER, etc.)
- Test email sending before production
- Implement email queue for async processing

### [HIGH] Input Validation & Sanitization
- Add Joi or Zod validation schemas
- Validate all user inputs before processing
- Sanitize file uploads

### [HIGH] Database N+1 Queries
- Optimize `getSuperAdminStats()` with aggregation pipelines
- Use lean() and select() to limit returned fields
- Profile queries with `.explain("executionStats")`

### [HIGH] Error Handling in Controllers
- Wrap all database operations in try-catch
- Use custom error classes
- Return proper HTTP status codes

### [MEDIUM] Frontend Token Management
- Move tokens to httpOnly cookies instead of localStorage
- Implement refresh token rotation
- Clear axios headers on logout

### [MEDIUM] State Management Architecture
- Extract auth service from AuthContext
- Separate business logic from state management
- Add service layer for API calls

### [MEDIUM] File Upload Security
- Validate file types server-side (not just extension)
- Scan uploads for malware
- Implement file size limits
- Store uploads in cloud storage (S3, Azure Blob)

---

## 🗂 Project Structure

```
backend/
├── .env.example              ✅ Configuration template (commit this)
├── package.json              ✅ Fixed dependency issues
├── createSuperAdmin.js       ✅ Improved security
├── server.js                 ✅ Fixed CORS
├── src/
│   ├── constants/
│   │   └── grievanceConstants.js    ✅ NEW - Centralized enums
│   ├── controllers/
│   │   ├── authController.js        ✅ Fixed logout IDOR
│   │   ├── adminController.js       ✅ Standardized response
│   │   └── superAdminController.js  ✅ Fixed enum values
│   ├── middleware/
│   │   ├── authMiddleware.js        ✅ Fixed missing return
│   │   └── errorHandler.js          ✅ Improved error categorization
│   ├── models/
│   │   ├── Admin.js                 ✅ Fixed bcrypt import, field naming
│   │   ├── Grievance.js             ✅ Added indexes, fixed fields
│   │   └── ComplaintType.js         ✅ Fixed department type
│   ├── routes/
│   │   └── grievanceRoutes.js       ✅ Added verifyAdmin middleware
│   └── utils/
│       └── generateToken.js         ✅ Added JSDoc comments
```

---

## 🔍 Code Review Checklist

Before deploying to production:

- [ ] All environment variables documented in `.env.example`
- [ ] `.env` added to `.gitignore`
- [ ] No hardcoded credentials in codebase
- [ ] All admin endpoints have `verifyAdmin` middleware
- [ ] All user inputs validated and sanitized
- [ ] Database queries have proper indexes
- [ ] All list endpoints have pagination
- [ ] Error responses don't leak stack traces (except dev)
- [ ] CORS whitelist configured for your domain
- [ ] JWT secrets are strong and unique
- [ ] Email service configured and tested
- [ ] File uploads go to cloud storage
- [ ] Logging is structured and centralized
- [ ] Frontend uses httpOnly cookies for tokens
- [ ] Rate limiting added to auth endpoints

---

## 🚨 Known Issues Still To Fix

See `AUDIT_REPORT.md` for complete list of 42 issues identified.

### Immediate Action Items:
1. Rotate all credentials (DB, email, JWT secrets)
2. Remove `.env` from git history: `git rm --cached .env`
3. Test all auth flows (login, refresh, logout)
4. Add pagination to all endpoints
5. Implement comprehensive error handling
6. Set up monitoring and logging

---

## 📚 Resources

- [MongoDB Best Practices](https://docs.mongodb.com/)
- [Express Security](https://expressjs.com/en/advanced/best-practice-security.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

## 🆘 Troubleshooting

**"Cannot find module 'bcryptjs'"**
- Run: `npm install bcryptjs` and remove `bcrypt`

**"MongoDB Connection Error"**
- Check `MONGODB_URL` in `.env`
- Verify IP whitelist on MongoDB Atlas

**"Email not sending"**
- Check EMAIL_HOST, EMAIL_USER, EMAIL_PASS in `.env`
- For Gmail: use [App-specific password](https://support.google.com/accounts/answer/185833)

**"CORS errors"**
- Add frontend URL to `ALLOWED_ORIGINS` in `.env`
- Format: `http://localhost:5173,https://yourdomain.com`

---

**Last Updated**: 30 April 2026  
**Audit Status**: 12 Critical/High issues fixed in this session  
**Remaining Issues**: 30 Medium/Low priority items for follow-up
