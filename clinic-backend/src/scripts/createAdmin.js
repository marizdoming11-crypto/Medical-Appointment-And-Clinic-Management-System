
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import pool from "../config/db.js";

dotenv.config();

const createAdmin = async () => {
  const email = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const password = process.env.BOOTSTRAP_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Please configure BOOTSTRAP_ADMIN_EMAIL and BOOTSTRAP_ADMIN_PASSWORD."
    );
  }

  if (password.length < 12) {
    throw new Error(
      "Admin password must contain at least 12 characters."
    );
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const [existing] = await pool.execute(
      "SELECT user_id, role FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existing.length > 0) {
      throw new Error(
        "This email already exists. No administrator was created."
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.execute(
      `INSERT INTO users
       (email, password_hash, role, account_status)
       VALUES (?, ?, 'admin', 'active')`,
      [normalizedEmail, passwordHash]
    );

    console.log("Administrator account created successfully.");

  } finally {
    await pool.end();
  }
};

createAdmin().catch(error => {
  console.error("Admin creation failed:", error.message);
  process.exitCode = 1;
});
