

# 🟦 **E-Grievance Hub – University Grievance Management System**

A complete MERN-stack platform designed to streamline grievance submission, tracking, and resolution for universities and institutions.

# 🌟 **Overview**

**E-Grievance Hub** connects **Students → Admins → SuperAdmins** in a single transparent workflow.
It eliminates manual paperwork, long queues, and miscommunication — giving real-time updates, tracking, and accountability inside a campus.

---

# 🚀 **Key Features**

### 🧑‍🎓 **For Students**

* File grievances quickly
* Choose department, grievance type, priority
* Attach files (PDF, images, etc.)
* Track real-time grievance progress
* Anonymous grievance option

### 🧑‍💼 **For Admins**

* View grievances assigned to their department
* Change status: *Pending → In Review → Resolved*
* Add solution notes & timeline
* Manage student queries

### 🏛️ **For SuperAdmins**

* Approve or reject admin registrations
* Manage departments & grievance categories
* View system-wide analytics
* Platform monitoring dashboard

### 📊 **Analytics & Dashboard**

* Total complaints
* Monthly trends
* Pie charts & bar graphs for grievance categories
* Department-wise performance

---

# 🧩 **Tech Stack**

### **Frontend**

* React + Vite
* Tailwind CSS
* Axios
* React Router
* Recharts (Charts & Insights)

### **Backend**

* Node.js
* Express.js
* MongoDB + Mongoose
* JWT Authentication
* Multer (File Uploads)

### **DevOps**

* Git + GitHub
* PM2 (optional for deployment)
* Nginx (optional)

---

# 🔐 **System Architecture**

```
                   ┌────────────────────────────────┐
                   │          Frontend (React)       │
                   │  - Student UI                   │
                   │  - Admin Dashboard              │
                   │  - SuperAdmin Panel             │
                   └────────────────────────────────┘
                                   │
                                   ▼
                       ┌─────────────────────┐
                       │    API Gateway      │
                       │  (Express Server)   │
                       └─────────────────────┘
                                   │
        ┌────────────────────────────────────────────────────────────┐
        │                            │                               │
        ▼                            ▼                               ▼
┌──────────────┐      ┌───────────────────────┐         ┌───────────────────────┐
│ Authentication│      │  Grievance Services  │         │  Admin/SuperAdmin     │
│ JWT + Middleware│    │ CRUD + File Uploads  │         │  Approvals & Config   │
└──────────────┘      └───────────────────────┘         └───────────────────────┘
                                   │
                                   ▼
                        ┌──────────────────────┐
                        │   MongoDB Database   │
                        │ Users / Admins /     │
                        │ Complaints / Logs    │
                        └──────────────────────┘
```

---

# 📁 **Project Structure (Backend)**

```
backend/
│
├── server.js
├── .env
│
├── src/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── Database/
│   └── uploads/
│
└── package.json
```

---

# 📁 **Project Structure (Frontend)**

```
frontend/
│
├── src/
│   ├── pages/
│   ├── components/
│   ├── layouts/
│   ├── api/
│   ├── hooks/
│   └── styles/
│
└── index.html
```

---

# ⚙️ **Environment Variables**

Create a `.env` file in **backend**:

```
PORT=5000
MONGO_URI=mongodb://localhost:27017/egrievance
JWT_SECRET=your_secret_key
CLOUD_UPLOAD_PATH=/uploads
```

---

# 🛠️ **Installation & Setup**

### **1️⃣ Clone the repository**

```bash
git clone https://github.com/yourusername/egrievance-hub.git
cd egrievance-hub
```

### **2️⃣ Install Backend**

```bash
cd backend
npm install
npm start
```

### **3️⃣ Install Frontend**

```bash
cd frontend
npm install
npm run dev
```

---

# 🔥 API Overview

### **Authentication**

| Method | Endpoint                | Description      |
| ------ | ----------------------- | ---------------- |
| POST   | `/api/users/register`   | Student Signup   |
| POST   | `/api/users/login`      | Student Login    |
| POST   | `/api/admin/login`      | Admin Login      |
| POST   | `/api/superadmin/login` | SuperAdmin Login |

### **Grievances**

| Method | Endpoint                     | Description          |
| ------ | ---------------------------- | -------------------- |
| POST   | `/api/grievances`            | Create grievance     |
| GET    | `/api/grievances/my`         | Student grievances   |
| PATCH  | `/api/grievances/:id/status` | Admin updates status |

---

# 🖼️ Screenshots (Add Later)

```
/screenshots/dashboard.png
/screenshots/student_form.png
/screenshots/admin_panel.png
/screenshots/superadmin.png
```

---

# 🤝 Contributing

We welcome contributions from students, faculty, and open-source developers.

1. Fork the repo
2. Create a new branch
3. Commit your changes
4. Submit a Pull Request

---

# 📜 License

This project is **Open Source** under the **MIT License**.

---

# 🎯 Final Notes

E-Grievance Hub is designed to:

* Improve transparency
* Speed up grievance resolutions
* Create accountability in institutions
* Offer a clean tech-driven workflow for students and administration

