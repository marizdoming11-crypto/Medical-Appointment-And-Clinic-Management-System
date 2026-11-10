
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import pool from "../config/db.js";

// ========================================
// GET ALL PATIENTS / SEARCH PATIENTS
// ========================================

export const getAllPatients = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    const [patients] = await pool.execute(
      `
        SELECT
          p.patient_id,
          p.user_id,
          u.email,
          u.account_status,
          p.first_name,
          p.middle_name,
          p.last_name,
          p.birth_date,
          p.sex,
          p.contact_number,
          p.address,
          p.created_at
        FROM patients p
        INNER JOIN users u ON p.user_id = u.user_id
        WHERE (
          ? = ''
          OR CAST(p.patient_id AS CHAR) LIKE ?
          OR p.first_name LIKE ?
          OR p.middle_name LIKE ?
          OR p.last_name LIKE ?
          OR CONCAT(p.first_name, ' ', p.last_name) LIKE ?
          OR u.email LIKE ?
        )
        ORDER BY p.created_at DESC
      `,
      [
        search,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`,
        `%${search}%`
      ]
    );

    return res.status(200).json({
      success: true,
      total: patients.length,
      patients
    });

  } catch (error) {
    console.error("Get patients error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve patients."
    });
  }
};


// ========================================
// GET PATIENT BY ID
// ========================================

export const getPatientById = async (req, res) => {
  try {
    const patientId = Number(req.params.id);

    if (!Number.isInteger(patientId) || patientId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid patient ID."
      });
    }

    const [patients] = await pool.execute(
      `
        SELECT
          p.patient_id,
          p.user_id,
          u.email,
          u.account_status,
          p.first_name,
          p.middle_name,
          p.last_name,
          p.birth_date,
          p.sex,
          p.contact_number,
          p.address,
          p.created_at
        FROM patients p
        INNER JOIN users u ON p.user_id = u.user_id
        WHERE p.patient_id = ?
      `,
      [patientId]
    );

    if (patients.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Patient not found."
      });
    }

    return res.status(200).json({
      success: true,
      patient: patients[0]
    });

  } catch (error) {
    console.error("Get patient error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve patient information."
    });
  }
};


// ========================================
// ADD PATIENT
// ========================================

export const addPatient = async (req, res) => {
  const {
    email,
    first_name,
    middle_name,
    last_name,
    birth_date,
    sex,
    contact_number,
    address
  } = req.body;

  if (
    typeof email !== "string" ||
    typeof first_name !== "string" ||
    typeof last_name !== "string" ||
    !email.trim() ||
    !first_name.trim() ||
    !last_name.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Email, first name, and last name are required."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address."
    });
  }

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

  if (
    birth_date &&
    !isValidDate(birth_date)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid birth date. Use YYYY-MM-DD."
    });
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

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

    // Generate a temporary password.
    // It is returned only once in the successful response.
    const temporaryPassword = randomBytes(12).toString("hex");
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    const [userResult] = await connection.execute(
      `
        INSERT INTO users
          (email, password_hash, role, account_status)
        VALUES (?, ?, 'patient', 'active')
      `,
      [normalizedEmail, passwordHash]
    );

    const [patientResult] = await connection.execute(
      `
        INSERT INTO patients
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
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
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
      message: "Patient added successfully.",
      patientId: patientResult.insertId,
      temporaryPassword
    });

  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Add patient error:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "This email address is already registered."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to add patient."
    });

  } finally {
    connection.release();
  }
};


// ========================================
// UPDATE PATIENT
// ========================================

export const updatePatient = async (req, res) => {
  const patientId = Number(req.params.id);

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid patient ID."
    });
  }

  const {
    email,
    first_name,
    middle_name,
    last_name,
    birth_date,
    sex,
    contact_number,
    address
  } = req.body;

  if (
    typeof email !== "string" ||
    typeof first_name !== "string" ||
    typeof last_name !== "string" ||
    !email.trim() ||
    !first_name.trim() ||
    !last_name.trim()
  ) {
    return res.status(400).json({
      success: false,
      message: "Email, first name, and last name are required."
    });
  }

  const normalizedEmail = email.trim().toLowerCase();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(400).json({
      success: false,
      message: "Please enter a valid email address."
    });
  }

  if (sex && !["Male", "Female", "Other"].includes(sex)) {
    return res.status(400).json({
      success: false,
      message: "Invalid sex selection."
    });
  }

  if (contact_number && !/^09\d{9}$/.test(contact_number)) {
    return res.status(400).json({
      success: false,
      message: "Contact number must contain 11 digits and start with 09."
    });
  }

  if (birth_date && !isValidDate(birth_date)) {
    return res.status(400).json({
      success: false,
      message: "Invalid birth date. Use YYYY-MM-DD."
    });
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [existingPatients] = await connection.execute(
      "SELECT user_id FROM patients WHERE patient_id = ?",
      [patientId]
    );

    if (existingPatients.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Patient not found."
      });
    }

    const userId = existingPatients[0].user_id;

    const [existingEmails] = await connection.execute(
      `
        SELECT user_id
        FROM users
        WHERE email = ? AND user_id <> ?
      `,
      [normalizedEmail, userId]
    );

    if (existingEmails.length > 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(409).json({
        success: false,
        message: "Email is already used by another account."
      });
    }

    await connection.execute(
      `
        UPDATE users
        SET email = ?
        WHERE user_id = ?
      `,
      [normalizedEmail, userId]
    );

    await connection.execute(
      `
        UPDATE patients
        SET
          first_name = ?,
          middle_name = ?,
          last_name = ?,
          birth_date = ?,
          sex = ?,
          contact_number = ?,
          address = ?
        WHERE patient_id = ?
      `,
      [
        first_name.trim(),
        middle_name?.trim() || null,
        last_name.trim(),
        birth_date || null,
        sex || null,
        contact_number || null,
        address?.trim() || null,
        patientId
      ]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      message: "Patient information updated successfully."
    });

  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Update patient error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update patient information."
    });

  } finally {
    connection.release();
  }
};


// ========================================
// DELETE / DEACTIVATE PATIENT
// ========================================

export const deletePatient = async (req, res) => {
  const patientId = Number(req.params.id);

  if (!Number.isInteger(patientId) || patientId <= 0) {
    return res.status(400).json({
      success: false,
      message: "Invalid patient ID."
    });
  }

  const connection = await pool.getConnection();
  let transactionStarted = false;

  try {
    await connection.beginTransaction();
    transactionStarted = true;

    const [patients] = await connection.execute(
      `
        SELECT patient_id, user_id
        FROM patients
        WHERE patient_id = ?
        FOR UPDATE
      `,
      [patientId]
    );

    if (patients.length === 0) {
      await connection.rollback();
      transactionStarted = false;

      return res.status(404).json({
        success: false,
        message: "Patient not found."
      });
    }

    const userId = patients[0].user_id;

    const [[appointmentCount]] = await connection.execute(
      `
        SELECT COUNT(*) AS total
        FROM appointments
        WHERE patient_id = ?
      `,
      [patientId]
    );

    const [[recordCount]] = await connection.execute(
      `
        SELECT COUNT(*) AS total
        FROM medical_records
        WHERE patient_id = ?
      `,
      [patientId]
    );

    const hasHistory =
      Number(appointmentCount.total) > 0 ||
      Number(recordCount.total) > 0;

    if (hasHistory) {
      await connection.execute(
        `
          UPDATE users
          SET account_status = 'inactive'
          WHERE user_id = ?
        `,
        [userId]
      );

      await connection.commit();
      transactionStarted = false;

      return res.status(200).json({
        success: true,
        deactivated: true,
        message:
          "Patient has existing appointments or medical records. The account was deactivated to preserve clinical history."
      });
    }

    // Preserve the user account for audit/history references.
    // Remove only the patient profile and deactivate the login.
    await connection.execute(
      "DELETE FROM patients WHERE patient_id = ?",
      [patientId]
    );

    await connection.execute(
      `
        UPDATE users
        SET account_status = 'inactive'
        WHERE user_id = ?
      `,
      [userId]
    );

    await connection.commit();
    transactionStarted = false;

    return res.status(200).json({
      success: true,
      deactivated: false,
      message: "Patient profile deleted and login account deactivated."
    });

  } catch (error) {
    if (transactionStarted) {
      await connection.rollback();
    }

    console.error("Delete patient error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to delete or deactivate patient."
    });

  } finally {
    connection.release();
  }
};


// ========================================
// DATE VALIDATION
// ========================================

function isValidDate(value) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);

  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}
