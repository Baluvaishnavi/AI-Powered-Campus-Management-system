import express from "express";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

// MySQL Database Configuration
const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "sist_scheduler",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

let dbInitialized = false;

// Initialize Database
async function initDb() {
  try {
    const connection = await pool.getConnection();
    console.log("Database connection successful");
    
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        role ENUM('student', 'faculty', 'admin', 'hod'),
        department VARCHAR(255),
        year INT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS announcements (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        content TEXT,
        category VARCHAR(255),
        start_date DATE,
        end_date DATE,
        date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        author_id INT,
        FOREIGN KEY(author_id) REFERENCES users(id)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS events (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        description TEXT,
        event_date DATETIME,
        location VARCHAR(255),
        registration_link VARCHAR(255),
        category VARCHAR(255),
        faculty_id INT,
        FOREIGN KEY(faculty_id) REFERENCES users(id) ON DELETE SET NULL
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS event_registrations (
        id INT AUTO_INCREMENT PRIMARY KEY,
        event_id INT,
        user_id INT,
        registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        od_approved BOOLEAN DEFAULT FALSE,
        od_requested BOOLEAN DEFAULT FALSE,
        od_description TEXT,
        FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    // Migration for existing tables
    try {
      await connection.query("ALTER TABLE events ADD COLUMN faculty_id INT, ADD FOREIGN KEY(faculty_id) REFERENCES users(id) ON DELETE SET NULL");
    } catch (e) {}
    try {
      await connection.query("ALTER TABLE event_registrations ADD COLUMN od_approved BOOLEAN DEFAULT FALSE");
    } catch (e) {}
    try {
      await connection.query("ALTER TABLE event_registrations ADD COLUMN od_requested BOOLEAN DEFAULT FALSE");
    } catch (e) {}
    try {
      await connection.query("ALTER TABLE event_registrations ADD COLUMN od_description TEXT");
    } catch (e) {}

    await connection.query(`
      CREATE TABLE IF NOT EXISTS schedules (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255),
        type ENUM('academic', 'holiday'),
        start_date DATE,
        end_date DATE,
        description TEXT
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS fees (
        id INT AUTO_INCREMENT PRIMARY KEY,
        department_name VARCHAR(255) UNIQUE,
        tuition_fee DECIMAL(10, 2),
        hostel_fee DECIMAL(10, 2)
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        subject VARCHAR(255),
        content TEXT,
        status ENUM('pending', 'resolved') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS leave_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT,
        subject VARCHAR(255),
        description TEXT,
        start_date DATE,
        end_date DATE,
        status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        department VARCHAR(255),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS student_profiles (
        user_id INT PRIMARY KEY,
        skills TEXT,
        certifications TEXT,
        target_role VARCHAR(255),
        FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);

    await connection.query(`
      CREATE TABLE IF NOT EXISTS placement_companies (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) UNIQUE,
        required_skills TEXT,
        min_cgpa DECIMAL(4, 2),
        description TEXT
      )
    `);

    // Ensure min_cgpa is DECIMAL(4, 2) to allow 10.00
    try {
      await connection.query("ALTER TABLE placement_companies MODIFY COLUMN min_cgpa DECIMAL(4, 2)");
    } catch (err) {
      console.log("ALTER TABLE placement_companies failed (might already be DECIMAL(4, 2))");
    }

    // Robust Seeding
    const seedUser = async (username: string, password: string, role: string, dept: string, year: number) => {
      try {
        const [rows]: any = await connection.query("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", [username]);
        if (rows.length === 0) {
          console.log(`Attempting to seed user: ${username} with role ${role}`);
          await connection.query("INSERT INTO users (username, password, role, department, year) VALUES (?, ?, ?, ?, ?)", [username, password, role, dept, year]);
          console.log(`Seeded user: ${username}`);
        } else {
          console.log(`User ${username} already exists, skipping seed.`);
        }
      } catch (err: any) {
        console.error(`Failed to seed user ${username}:`, err.message);
      }
    };

    await seedUser("admin", "admin123", "admin", "CSE", 0);
    await seedUser("hod_cse", "hod123", "hod", "CSE", 0);
    await seedUser("hod_ece", "hod123", "hod", "ECE", 0);
    await seedUser("hod_mech", "hod123", "hod", "MECH", 0);
    await seedUser("faculty1", "faculty123", "faculty", "CSE", 0);
    await seedUser("student1", "student123", "student", "CSE", 3);

    // Seed Placement Companies
    const seedCompany = async (name: string, skills: string, cgpa: number, desc: string) => {
      try {
        const [rows]: any = await connection.query("SELECT id FROM placement_companies WHERE name = ?", [name]);
        if (rows.length === 0) {
          await connection.query("INSERT INTO placement_companies (name, required_skills, min_cgpa, description) VALUES (?, ?, ?, ?)", [name, skills, cgpa, desc]);
        }
      } catch (err) {}
    };

    await seedCompany("TCS", "Java, SQL, Aptitude, Communication", 7.0, "Global IT services leader.");
    await seedCompany("Cognizant", "Java/Python, Web Technologies, DBMS", 7.5, "Professional services company.");
    await seedCompany("Tech Startup", "React, Node.js, MongoDB, Problem Solving", 8.0, "Fast-paced innovation hub.");
    await seedCompany("Accenture", "Cloud Computing, Java, Analytics", 7.0, "Strategy and consulting.");

    const [feeRows]: any = await connection.query("SELECT COUNT(*) as count FROM fees");
    if (feeRows[0].count === 0) {
      await connection.query("INSERT INTO fees (department_name, tuition_fee, hostel_fee) VALUES (?, ?, ?)", ["CSE", 150000.00, 80000.00]);
      await connection.query("INSERT INTO fees (department_name, tuition_fee, hostel_fee) VALUES (?, ?, ?)", ["ECE", 140000.00, 80000.00]);
    }

    // Log users for verification
    const [allUsers]: any = await connection.query("SELECT username, role FROM users");
    console.log("Registered users in DB:", allUsers);

    connection.release();
    dbInitialized = true;
    console.log("Database initialization complete");
  } catch (error) {
    console.error("Database connection failed. Please ensure MySQL is running and configured correctly in .env");
    console.error(error);
  }
}

await initDb();

// Middleware to check DB status
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && req.path !== '/api/health' && !dbInitialized) {
    // We can still try to process if it's just a transient error, 
    // but for the first time we want to warn the user.
    // Actually, let's just let it try and fail naturally if the pool is broken.
  }
  next();
});

app.use(express.json());

// API Routes
app.post("/api/login", async (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password?.trim();
  
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  console.log(`Login attempt for: ${username}`);
  try {
    const [rows]: any = await pool.query("SELECT * FROM users WHERE LOWER(username) = LOWER(?)", [username]);
    const user = rows[0];
    
    if (user && user.password === password) {
      console.log(`Login successful: ${user.username} (${user.role})`);
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } else {
      console.log(`Login failed for username: ${username} - ${user ? "Wrong password" : "User not found"}`);
      res.status(401).json({ error: "Invalid username or password" });
    }
  } catch (error: any) {
    console.error("Login error:", error.message);
    res.status(500).json({ error: "Database error during login" });
  }
});

app.get("/api/announcements", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM announcements ORDER BY date DESC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch announcements" });
  }
});

app.get("/api/events", async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT e.*, u.username as faculty_name 
      FROM events e 
      LEFT JOIN users u ON e.faculty_id = u.id 
      ORDER BY e.event_date ASC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch events" });
  }
});

app.get("/api/schedules", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM schedules ORDER BY start_date ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch schedules" });
  }
});

app.get("/api/fees", async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM fees ORDER BY department_name ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch fees" });
  }
});

app.post("/api/events/:id/register", async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  try {
    const [existing]: any = await pool.query("SELECT * FROM event_registrations WHERE event_id = ? AND user_id = ?", [id, user_id]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Already registered" });
    }
    await pool.query("INSERT INTO event_registrations (event_id, user_id) VALUES (?, ?)", [id, user_id]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to register" });
  }
});

app.post("/api/events/:id/unregister", async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body;
  try {
    await pool.query("DELETE FROM event_registrations WHERE event_id = ? AND user_id = ?", [id, user_id]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to unregister" });
  }
});

app.get("/api/my-registrations/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const [rows]: any = await pool.query(`
      SELECT event_id, od_approved, od_requested FROM event_registrations WHERE user_id = ?
    `, [user_id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

app.patch("/api/events/:id/request-od", async (req, res) => {
  const { id } = req.params;
  const { user_id, od_description } = req.body;
  try {
    await pool.query("UPDATE event_registrations SET od_requested = TRUE, od_description = ? WHERE event_id = ? AND user_id = ?", [od_description || null, id, user_id]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to request OD" });
  }
});

// Role-based Access Control Middleware (Simple)
const checkRole = (roles: string[]) => (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const userRole = req.headers["x-user-role"] as string;
  if (roles.includes(userRole)) {
    next();
  } else {
    res.status(403).json({ error: "Access denied. Insufficient permissions." });
  }
};

// New API: Get registrations for an event
app.get("/api/events/:id/registrations", checkRole(["admin", "faculty"]), async (req, res) => {
  const { id } = req.params;
  const userIdHeader = req.headers["x-user-id"] as string;
  try {
    // Check if the user is the faculty in charge of this event
    const [eventRows]: any = await pool.query("SELECT faculty_id FROM events WHERE id = ?", [id]);
    if (eventRows.length === 0) return res.status(404).json({ error: "Event not found" });
    
    if (eventRows[0].faculty_id !== parseInt(userIdHeader)) {
      return res.status(403).json({ error: "Access denied. Only the faculty in-charge can manage OD approvals." });
    }

    const [rows]: any = await pool.query(`
      SELECT er.*, u.username, u.department, u.year 
      FROM event_registrations er 
      JOIN users u ON er.user_id = u.id 
      WHERE er.event_id = ?
    `, [id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch registrations" });
  }
});

// New API: Toggle OD approval
app.patch("/api/events/:id/registrations/:userId/od", checkRole(["admin", "faculty"]), async (req, res) => {
  const { id, userId } = req.params;
  const { od_approved } = req.body;
  const userIdHeader = req.headers["x-user-id"] as string;
  try {
    // Check if the user is the faculty in charge of this event
    const [eventRows]: any = await pool.query("SELECT faculty_id FROM events WHERE id = ?", [id]);
    if (eventRows.length === 0) return res.status(404).json({ error: "Event not found" });
    
    if (eventRows[0].faculty_id !== parseInt(userIdHeader)) {
      return res.status(403).json({ error: "Access denied. Only the faculty in-charge can manage OD approvals." });
    }

    await pool.query("UPDATE event_registrations SET od_approved = ? WHERE event_id = ? AND user_id = ?", [od_approved ? 1 : 0, id, userId]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update OD status" });
  }
});

app.get("/api/users", checkRole(["admin"]), async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT id, username, role, department, year FROM users ORDER BY role ASC, username ASC");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.post("/api/signup", async (req, res) => {
  const username = req.body.username?.trim();
  const password = req.body.password?.trim();
  const { department, year } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required" });
  }

  try {
    const [existing]: any = await pool.query("SELECT id FROM users WHERE LOWER(username) = LOWER(?)", [username]);
    if (existing.length > 0) {
      return res.status(400).json({ error: "Username already exists" });
    }
    await pool.query("INSERT INTO users (username, password, role, department, year) VALUES (?, ?, 'student', ?, ?)", [
      username, password, department, year
    ]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Signup failed" });
  }
});

app.post("/api/users", checkRole(["admin"]), async (req, res) => {
  const { username, password, role, department, year } = req.body;
  try {
    if (role === 'admin') {
      const [admins]: any = await pool.query("SELECT id FROM users WHERE role = 'admin'");
      if (admins.length > 0) {
        return res.status(400).json({ error: "Only one admin is allowed in the system." });
      }
    }
    await pool.query("INSERT INTO users (username, password, role, department, year) VALUES (?, ?, ?, ?, ?)", [
      username, password, role, department, year
    ]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create user" });
  }
});

app.delete("/api/users/:id", checkRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  try {
    const [user]: any = await pool.query("SELECT role FROM users WHERE id = ?", [id]);
    if (user.length > 0 && user[0].role === 'admin') {
      const [admins]: any = await pool.query("SELECT id FROM users WHERE role = 'admin'");
      if (admins.length <= 1) {
        return res.status(400).json({ error: "Cannot delete the only admin in the system." });
      }
    }
    await pool.query("DELETE FROM users WHERE id = ?", [id]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
});

app.post("/api/announcements", checkRole(["admin", "faculty"]), async (req, res) => {
  const { title, content, category, author_id, start_date, end_date } = req.body;
  try {
    const [result]: any = await pool.query("INSERT INTO announcements (title, content, category, author_id, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)", [title, content, category, author_id, start_date, end_date]);
    res.json({ id: result.insertId, status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create announcement" });
  }
});

app.post("/api/events", checkRole(["admin", "faculty"]), async (req, res) => {
  const { title, description, event_date, location, registration_link, category, faculty_id } = req.body;
  try {
    const [result]: any = await pool.query("INSERT INTO events (title, description, event_date, location, registration_link, category, faculty_id) VALUES (?, ?, ?, ?, ?, ?, ?)", [
      title, description, event_date, location, registration_link, category, faculty_id
    ]);
    res.json({ id: result.insertId, status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create event" });
  }
});

app.post("/api/schedules", checkRole(["admin"]), async (req, res) => {
  const { title, type, start_date, end_date, description } = req.body;
  try {
    const [result]: any = await pool.query("INSERT INTO schedules (title, type, start_date, end_date, description) VALUES (?, ?, ?, ?, ?)", [
      title, type, start_date, end_date, description
    ]);
    res.json({ id: result.insertId, status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to create schedule" });
  }
});

app.delete("/api/announcements/:id", checkRole(["admin", "faculty"]), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM announcements WHERE id = ?", [id]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete announcement" });
  }
});

app.delete("/api/events/:id", checkRole(["admin", "faculty"]), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM event_registrations WHERE event_id = ?", [id]);
    await pool.query("DELETE FROM events WHERE id = ?", [id]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete event" });
  }
});

app.post("/api/fees", checkRole(["admin"]), async (req, res) => {
  const { department_name, tuition_fee, hostel_fee } = req.body;
  try {
    const [rows]: any = await pool.query("SELECT id FROM fees WHERE department_name = ?", [department_name]);
    if (rows.length > 0) {
      await pool.query("UPDATE fees SET tuition_fee = ?, hostel_fee = ? WHERE department_name = ?", [tuition_fee, hostel_fee, department_name]);
      res.json({ status: "success", action: "updated" });
    } else {
      await pool.query("INSERT INTO fees (department_name, tuition_fee, hostel_fee) VALUES (?, ?, ?)", [department_name, tuition_fee, hostel_fee]);
      res.json({ status: "success", action: "created" });
    }
  } catch (error) {
    res.status(500).json({ error: "Failed to manage fees" });
  }
});

app.delete("/api/fees/:id", checkRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query("DELETE FROM fees WHERE id = ?", [id]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete fee record" });
  }
});

app.post("/api/complaints", async (req, res) => {
  const { user_id, subject, content } = req.body;
  try {
    await pool.query("INSERT INTO complaints (user_id, subject, content) VALUES (?, ?, ?)", [user_id, subject, content]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit complaint" });
  }
});

app.get("/api/complaints", checkRole(["admin"]), async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT c.*, u.username, u.department 
      FROM complaints c 
      JOIN users u ON c.user_id = u.id 
      ORDER BY c.created_at DESC
    `);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

app.get("/api/my-complaints/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM complaints WHERE user_id = ? ORDER BY created_at DESC", [user_id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch complaints" });
  }
});

app.patch("/api/complaints/:id/status", checkRole(["admin"]), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query("UPDATE complaints SET status = ? WHERE id = ?", [status, id]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update complaint status" });
  }
});

app.delete("/api/complaints/:id", async (req, res) => {
  const { id } = req.params;
  const userRole = req.headers["x-user-role"] as string;
  const userId = req.headers["x-user-id"] as string;

  try {
    if (userRole === 'admin') {
      await pool.query("DELETE FROM complaints WHERE id = ?", [id]);
    } else {
      const [complaint]: any = await pool.query("SELECT user_id FROM complaints WHERE id = ?", [id]);
      if (complaint.length > 0 && complaint[0].user_id == userId) {
        await pool.query("DELETE FROM complaints WHERE id = ?", [id]);
      } else {
        return res.status(403).json({ error: "Access denied. You can only delete your own complaints." });
      }
    }
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete complaint" });
  }
});

app.post("/api/leaves", async (req, res) => {
  const { user_id, subject, description, start_date, end_date, department } = req.body;
  try {
    await pool.query(
      "INSERT INTO leave_requests (user_id, subject, description, start_date, end_date, department) VALUES (?, ?, ?, ?, ?, ?)",
      [user_id, subject, description, start_date, end_date, department]
    );
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to submit leave request" });
  }
});

app.get("/api/my-leaves/:user_id", async (req, res) => {
  const { user_id } = req.params;
  try {
    const [rows] = await pool.query("SELECT * FROM leave_requests WHERE user_id = ? ORDER BY created_at DESC", [user_id]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch leave requests" });
  }
});

app.get("/api/dept-leaves/:department", checkRole(["hod", "admin"]), async (req, res) => {
  const { department } = req.params;
  try {
    const [rows] = await pool.query(`
      SELECT l.*, u.username 
      FROM leave_requests l 
      JOIN users u ON l.user_id = u.id 
      WHERE l.department = ? 
      ORDER BY l.created_at DESC
    `, [department]);
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch department leave requests" });
  }
});

app.patch("/api/leaves/:id/status", checkRole(["hod", "admin"]), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    await pool.query("UPDATE leave_requests SET status = ? WHERE id = ?", [status, id]);
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to update leave status" });
  }
});

app.delete("/api/leaves/:id", async (req, res) => {
  const { id } = req.params;
  const userRole = req.headers["x-user-role"] as string;
  const userId = req.headers["x-user-id"] as string;

  try {
    if (userRole === 'admin' || userRole === 'hod') {
      await pool.query("DELETE FROM leave_requests WHERE id = ?", [id]);
    } else {
      const [leave]: any = await pool.query("SELECT user_id FROM leave_requests WHERE id = ?", [id]);
      if (leave.length > 0 && leave[0].user_id == userId) {
        await pool.query("DELETE FROM leave_requests WHERE id = ?", [id]);
      } else {
        return res.status(403).json({ error: "Access denied." });
      }
    }
    res.json({ status: "success" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete leave request" });
  }
});

  // Placement Roadmap APIs
  console.log("Registering placement routes...");
  app.get("/api/placement/companies", async (req, res) => {
    console.log("GET /api/placement/companies hit");
    try {
      const [rows] = await pool.query("SELECT * FROM placement_companies");
      res.json(rows);
    } catch (err) {
      console.error("GET /api/placement/companies error:", err);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  app.get("/api/placement/profile/:userId", async (req, res) => {
    try {
      const [rows]: any = await pool.query("SELECT * FROM student_profiles WHERE user_id = ?", [req.params.userId]);
      res.json(rows[0] || { skills: "", certifications: "", target_role: "" });
    } catch (err) {
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  app.post("/api/placement/profile", async (req, res) => {
    const { user_id, skills, certifications, target_role } = req.body;
    try {
      await pool.query(
        "INSERT INTO student_profiles (user_id, skills, certifications, target_role) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE skills = ?, certifications = ?, target_role = ?",
        [user_id, skills, certifications, target_role, skills, certifications, target_role]
      );
      res.json({ message: "Profile updated" });
    } catch (err) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.post("/api/placement/companies", checkRole(["admin", "faculty"]), async (req, res) => {
    console.log("POST /api/placement/companies hit", req.body);
    const { name, required_skills, min_cgpa, description } = req.body;
    try {
      await pool.query(
        "INSERT INTO placement_companies (name, required_skills, min_cgpa, description) VALUES (?, ?, ?, ?)",
        [name, required_skills, min_cgpa, description]
      );
      console.log("Company added successfully:", name);
      res.json({ message: "Company added" });
    } catch (err) {
      console.error("POST /api/placement/companies error:", err);
      res.status(500).json({ error: "Failed to add company" });
    }
  });

  app.delete("/api/placement/companies/:id", checkRole(["admin", "faculty"]), async (req, res) => {
    try {
      await pool.query("DELETE FROM placement_companies WHERE id = ?", [req.params.id]);
      res.json({ message: "Company deleted" });
    } catch (err) {
      res.status(500).json({ error: "Failed to delete company" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false // Disable HMR to avoid port conflicts in some environments
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(process.cwd(), "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(process.cwd(), "dist", "index.html"));
    });
  }

  const server = app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      console.error(`Error: Port ${PORT} is already in use. Please close the application using this port and try again.`);
      process.exit(1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
