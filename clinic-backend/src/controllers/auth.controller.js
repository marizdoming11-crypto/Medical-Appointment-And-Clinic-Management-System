
import bcrypt from "bcryptjs";
import pool from "../config/db.js";
import generateToken from "../utils/generateToken.js";

// ========================================
// PATIENT REGISTRATION
// ========================================

export const registerPatient = async (req, res) => {
  const {
    email,
    password,
    first_name,
    middle_name,
    last_name,
    birth_date,
    sex,
    contact_number,
    address
  } = req.body;

  // Validate required fields
  if (
    !email ||
    !password ||
    !first_name ||
    !last_name
  ) {
    return res.status(400).json({
      success: false,
      message: "Email, password, first name, and last name are required."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  // Validate email
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address."
    });
  }

  // Validate password
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must contain at least 8 characters."
    });
  }

  // Validate optional fields
  if (sex && !["Male", "Female", "Other"].includes(sex)) {
    return res.status(400).json({
      success: false,
      message: "Invalid sex selection."
    });
  }

  if (
    contact_number &&
    !/^09\d{9}$/.test(contact_number)
  ) {
    return res.status(400).json({
      success: false,
      message: "Contact number must contain 11 digits and start with 09."
    });
  }

  const connection = await pool.getConnection();

  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    // Check existing email
    const [existingUsers] = await connection.execute(
      "SELECT user_id FROM users WHERE email = ?",
      [normalizedEmail]
    );

    if (existingUsers.length > 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message: "Email is already registered."
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user account
    const [userResult] = await connection.execute(
      `INSERT INTO users
       (email, password_hash, role, account_status)
       VALUES (?, ?, 'patient', 'active')`,
      [normalizedEmail, passwordHash]
    );

    // Create patient profile
    await connection.execute(
      `INSERT INTO patients
       (
         user_id,
         first_name,
         middle_name,
         last_name,
         birth_date,
         sex,
         contact_number,
         address
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userResult.insertId,
        first_name.trim(),
        middle_name?.trim() || null,
        last_name.trim(),
        birth_date || null,
        sex || null,
        contact_number || null,
        address?.trim() || null
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(201).json({
      success: true,
      message: "Patient account registered successfully."
    });

  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Registration error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to register patient."
    });

  } finally {
    connection.release();
  }
};


// ========================================
// ADMIN AND PATIENT LOGIN
// ========================================

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required."
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const [users] = await pool.execute(
      `SELECT
        user_id,
        email,
        password_hash,
        role,
        account_status
       FROM users
       WHERE email = ?`,
      [normalizedEmail]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    const user = users[0];

    if (user.account_status !== "active") {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive."
      });
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password_hash
    );

    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password."
      });
    }

    // Generate JWT
    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error("Login error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to process login."
    });
  }
};


// ========================================
// GET AUTHENTICATED USER
// ========================================

export const getCurrentUser = async (req, res) => {
  try {
    const [users] = await pool.execute(
      `SELECT
        user_id,
        email,
        role,
        account_status
       FROM users
       WHERE user_id = ?`,
      [req.user.userId]
    );

    if (users.length === 0 || users[0].account_status !== "active") {
      return res.status(404).json({
        success: false,
        message: "User account not found or inactive."
      });
    }

    const user = users[0];

    let patient = null;

    if (user.role === "patient") {
      const [patients] = await pool.execute(
        `SELECT
          patient_id,
          first_name,
          middle_name,
          last_name,
          birth_date,
          sex,
          contact_number,
          address
         FROM patients
         WHERE user_id = ?`,
        [user.user_id]
      );

      patient = patients[0] || null;
    }

    return res.status(200).json({
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        patient
      }
    });

  } catch (error) {
    console.error("Current user error:", error.message);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve account information."
    });
  }
};
