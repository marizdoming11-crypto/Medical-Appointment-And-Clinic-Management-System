
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import readline from "node:readline/promises";
import pool from "../config/db.js";

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const resetAdminPassword = async () => {
  try {
    const email = (
      await rl.question("Enter Admin email: ")
    ).trim().toLowerCase();

    const password = await rl.question(
      "Enter your new Admin password: "
    );

    if (password.length < 12) {
      throw new Error(
        "Password must contain at least 12 characters."
      );
    }

    const [admins] = await pool.execute(
      `SELECT user_id FROM users
       WHERE email = ? AND role = 'admin'`,
      [email]
    );

    if (admins.length === 0) {
      throw new Error("Admin account not found.");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await pool.execute(
      `UPDATE users
       SET password_hash = ?
       WHERE email = ? AND role = 'admin'`,
      [passwordHash, email]
    );

    console.log(
      "\nAdmin password updated successfully!"
    );

  } catch (error) {
    console.error(
      "\nPassword reset failed:",
      error.message
    );
    process.exitCode = 1;

  } finally {
    rl.close();
    await pool.end();
  }
};

await resetAdminPassword();
