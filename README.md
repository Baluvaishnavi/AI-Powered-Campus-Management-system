# SIST Student & Faculty Portal

A comprehensive, production-ready full-stack application designed for college campus management. This portal streamlines academic scheduling, event coordination, leave management, and student-faculty communication.

## 🚀 Features

### 👨‍🎓 For Students
- **Personalized Dashboard:** View latest campus announcements and upcoming events.
- **Event Management:** Register for workshops, hackathons, and sports. Request **On-Duty (OD)** approval with specific reasons.
- **Academic Timeline:** Track important dates, exams, and holidays.
- **Leave & Complaints:** Submit leave requests and lodge complaints directly to the administration.
- **Placement Portal:** View visiting companies, required skills, and maintain a professional profile (skills/certifications).
- **AI Assistant:** Integrated Gemini-powered chatbot for campus-related queries.

### 👩‍🏫 For Faculty & HODs
- **Announcement Creation:** Post academic or general notices to the entire campus.
- **Event Coordination:** Create events and manage student registrations.
- **OD Approvals:** Review and approve/reject student OD requests with full visibility into their reasons.
- **Leave Management:** HODs can review and act on department-specific leave requests.

### 🛠️ For Administrators
- **User Management:** Create, manage, and delete user accounts (Students, Faculty, HODs).
- **System Overview:** Monitor all complaints and system-wide activities.

## 🛡️ Security & Performance
- **Password Hashing:** All user passwords are encrypted using **Bcrypt** (one-way hashing).
- **Database Indexing:** Optimized MySQL queries with strategic indexing for high-speed data retrieval even with thousands of records.
- **API Pagination:** Efficient data loading for announcements and events to ensure smooth performance.
- **Role-Based Access Control (RBAC):** Strict server-side middleware to ensure users only access authorized data.

## 💻 Tech Stack
- **Frontend:** React 18, Tailwind CSS, Lucide React (Icons), Motion (Animations).
- **Backend:** Node.js, Express.js.
- **Database:** MySQL (Relational Data).
- **AI:** Google Gemini API (`@google/genai`),Cerebres API key.

## 🛠️ Setup & Installation

### Environment Variables
Create a `.env` file in the root directory with the following:
```env
# Database Configuration
DB_HOST=your_mysql_host
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=sist_scheduler

# AI Configuration
GEMINI_API_KEY=your_google_gemini_api_key
```

### Installation
1. Install dependencies:
   ```bash
   npm install
   ```
2. Start the development server:
   ```bash
   npm run dev
   ```

## 🔑 Demo Credentials
| Role | Username | Password |
| :--- | :--- | :--- |
| **Admin** | `admin` | `admin123` |
| **Faculty** | `faculty1` | `faculty123` |
| **Student** | `student1` | `student123` |
| **HOD (CSE)** | `hod_cse` | `hod123` |

