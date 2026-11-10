
import pool from "../config/db.js";

// ========================================
// GET ALL DOCTORS / SEARCH DOCTORS
// ========================================

export const getAllDoctors = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    const [doctors] = await pool.execute(
      `
        SELECT
          doctor_id,
          first_name,
          last_name,
          specialization,
          contact_number,
          email,
          status,
          created_at
        FROM doctors
        WHERE
          ? = ''
          OR CAST(doctor_id AS CHAR) LIKE ?
          OR first_name LIKE ?
          OR last_name LIKE ?
          OR CONCAT(first_name, ' ', last_name) LIKE ?
          OR specialization LIKE ?
          OR email LIKE ?
        ORDER BY created_at DESC
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
      total: doctors.length,
      doctors
    });
  } catch (error) {
    console.error("Get doctors error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve doctors."
    });
  }
};

// ========================================
// GET DOCTOR BY ID
// ========================================

export const getDoctorById = async (req, res) => {
  try {
    const doctorId = Number(req.params.id);

    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID."
      });
    }

    const [doctors] = await pool.execute(
      `
        SELECT
          doctor_id,
          first_name,
          last_name,
          specialization,
          contact_number,
          email,
          status,
          created_at
        FROM doctors
        WHERE doctor_id = ?
      `,
      [doctorId]
    );

    if (doctors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found."
      });
    }

    return res.status(200).json({
      success: true,
      doctor: doctors[0]
    });
  } catch (error) {
    console.error("Get doctor error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve doctor information."
    });
  }
};

// ========================================
// ADD DOCTOR
// ========================================

export const addDoctor = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      specialization,
      contact_number,
      email,
      status
    } = req.body;

    if (
      typeof first_name !== "string" ||
      typeof last_name !== "string" ||
      typeof specialization !== "string" ||
      !first_name.trim() ||
      !last_name.trim() ||
      !specialization.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and specialization are required."
      });
    }

    const normalizedFirstName = first_name.trim();
    const normalizedLastName = last_name.trim();
    const normalizedSpecialization = specialization.trim();

    const normalizedContact =
      typeof contact_number === "string"
        ? contact_number.trim()
        : "";

    const normalizedEmail =
      typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

    const normalizedStatus = status || "Available";

    if (
      normalizedContact &&
      !/^09\d{9}$/.test(normalizedContact)
    ) {
      return res.status(400).json({
        success: false,
        message: "Contact number must contain 11 digits and start with 09."
      });
    }

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    if (!["Available", "Unavailable"].includes(normalizedStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor status."
      });
    }

    const [result] = await pool.execute(
      `
        INSERT INTO doctors (
          first_name,
          last_name,
          specialization,
          contact_number,
          email,
          status
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        normalizedFirstName,
        normalizedLastName,
        normalizedSpecialization,
        normalizedContact || null,
        normalizedEmail || null,
        normalizedStatus
      ]
    );

    return res.status(201).json({
      success: true,
      message: "Doctor added successfully.",
      doctorId: result.insertId
    });
  } catch (error) {
    console.error("Add doctor error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to add doctor."
    });
  }
};

// ========================================
// UPDATE DOCTOR
// ========================================

export const updateDoctor = async (req, res) => {
  try {
    const doctorId = Number(req.params.id);

    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID."
      });
    }

    const {
      first_name,
      last_name,
      specialization,
      contact_number,
      email,
      status
    } = req.body;

    if (
      typeof first_name !== "string" ||
      typeof last_name !== "string" ||
      typeof specialization !== "string" ||
      !first_name.trim() ||
      !last_name.trim() ||
      !specialization.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "First name, last name, and specialization are required."
      });
    }

    const normalizedContact =
      typeof contact_number === "string"
        ? contact_number.trim()
        : "";

    const normalizedEmail =
      typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

    if (
      normalizedContact &&
      !/^09\d{9}$/.test(normalizedContact)
    ) {
      return res.status(400).json({
        success: false,
        message: "Contact number must contain 11 digits and start with 09."
      });
    }

    if (
      normalizedEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
    ) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    if (!["Available", "Unavailable"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor status."
      });
    }

    const [existingDoctors] = await pool.execute(
      "SELECT doctor_id FROM doctors WHERE doctor_id = ?",
      [doctorId]
    );

    if (existingDoctors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found."
      });
    }

    await pool.execute(
      `
        UPDATE doctors
        SET
          first_name = ?,
          last_name = ?,
          specialization = ?,
          contact_number = ?,
          email = ?,
          status = ?
        WHERE doctor_id = ?
      `,
      [
        first_name.trim(),
        last_name.trim(),
        specialization.trim(),
        normalizedContact || null,
        normalizedEmail || null,
        status,
        doctorId
      ]
    );

    return res.status(200).json({
      success: true,
      message: "Doctor information updated successfully."
    });
  } catch (error) {
    console.error("Update doctor error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update doctor information."
    });
  }
};

// ========================================
// DELETE DOCTOR
// ========================================

export const deleteDoctor = async (req, res) => {
  try {
    const doctorId = Number(req.params.id);

    if (!Number.isInteger(doctorId) || doctorId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID."
      });
    }

    const [existingDoctors] = await pool.execute(
      "SELECT doctor_id FROM doctors WHERE doctor_id = ?",
      [doctorId]
    );

    if (existingDoctors.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found."
      });
    }

    const [[appointmentCount]] = await pool.execute(
      `
        SELECT COUNT(*) AS total
        FROM appointments
        WHERE doctor_id = ?
      `,
      [doctorId]
    );

    const [[recordCount]] = await pool.execute(
      `
        SELECT COUNT(*) AS total
        FROM medical_records
        WHERE doctor_id = ?
      `,
      [doctorId]
    );

    const hasHistory =
      Number(appointmentCount.total) > 0 ||
      Number(recordCount.total) > 0;

    if (hasHistory) {
      return res.status(409).json({
        success: false,
        message:
          "This doctor has existing appointments or medical records. Set the doctor status to Unavailable instead of deleting the record."
      });
    }

    await pool.execute(
      "DELETE FROM doctors WHERE doctor_id = ?",
      [doctorId]
    );

    return res.status(200).json({
      success: true,
      message: "Doctor deleted successfully."
    });
  } catch (error) {
    console.error("Delete doctor error:", error);

    if (
      error.code === "ER_ROW_IS_REFERENCED_2" ||
      error.code === "ER_NO_REFERENCED_ROW_2"
    ) {
      return res.status(409).json({
        success: false,
        message:
          "This doctor is linked to another record and cannot be deleted."
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to delete doctor."
    });
  }
};
