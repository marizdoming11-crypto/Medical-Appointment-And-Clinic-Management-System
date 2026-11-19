
import pool from "../config/db.js";

// GET clinic information
export const getClinicSettings = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT setting_id, clinic_name, address, contact_number, email
       FROM clinic_settings
       ORDER BY setting_id ASC
       LIMIT 1`
    );

    return res.status(200).json({
      success: true,
      data: rows[0] || null
    });
  } catch (error) {
    console.error("Get clinic settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve clinic information."
    });
  }
};

// UPDATE or CREATE clinic information
export const updateClinicSettings = async (req, res) => {
  try {
    const {
      clinic_name,
      address,
      contact_number,
      email
    } = req.body;

    if (!clinic_name || !clinic_name.trim()) {
      return res.status(400).json({
        success: false,
        message: "Clinic name is required."
      });
    }

    if (contact_number && !/^[0-9+\-()\s]{7,20}$/.test(contact_number)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid contact number."
      });
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address."
      });
    }

    const [existing] = await pool.query(
      "SELECT setting_id FROM clinic_settings ORDER BY setting_id ASC LIMIT 1"
    );

    if (existing.length > 0) {
      await pool.query(
        `UPDATE clinic_settings
         SET clinic_name = ?,
             address = ?,
             contact_number = ?,
             email = ?
         WHERE setting_id = ?`,
        [
          clinic_name.trim(),
          address?.trim() || null,
          contact_number?.trim() || null,
          email?.trim() || null,
          existing[0].setting_id
        ]
      );
    } else {
      await pool.query(
        `INSERT INTO clinic_settings
         (clinic_name, address, contact_number, email)
         VALUES (?, ?, ?, ?)`,
        [
          clinic_name.trim(),
          address?.trim() || null,
          contact_number?.trim() || null,
          email?.trim() || null
        ]
      );
    }

    return res.status(200).json({
      success: true,
      message: "Clinic information saved successfully."
    });
  } catch (error) {
    console.error("Update clinic settings error:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to save clinic information."
    });
  }
};
