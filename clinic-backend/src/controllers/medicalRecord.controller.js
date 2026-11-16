
import pool from "../config/db.js";

// ========================================
// GET ALL MEDICAL RECORDS
// SEARCH BY PATIENT OR RECORD ID
// ========================================

export const getAllMedicalRecords = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();

    let query = `
      SELECT
        mr.record_id,
        mr.patient_id,
        mr.doctor_id,
        mr.appointment_id,
        mr.diagnosis,
        mr.prescription,
        mr.treatment,
        mr.remarks,
        DATE_FORMAT(mr.consultation_date, '%Y-%m-%d') AS consultation_date,
        mr.created_at,
        CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
        p.contact_number AS patient_contact,
        p.sex AS patient_sex,
        TIMESTAMPDIFF(YEAR, p.birth_date, mr.consultation_date) AS patient_age,
        CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
        d.specialization AS doctor_specialization,
        s.service_name
      FROM medical_records mr
      INNER JOIN patients p ON mr.patient_id = p.patient_id
      INNER JOIN doctors d ON mr.doctor_id = d.doctor_id
      LEFT JOIN appointments a ON mr.appointment_id = a.appointment_id
      LEFT JOIN services s ON a.service_id = s.service_id
    `;

    const params = [];

    if (search) {
      query += `
        WHERE
          CAST(mr.record_id AS CHAR) LIKE ?
          OR CONCAT(p.first_name, ' ', p.last_name) LIKE ?
          OR CONCAT(d.first_name, ' ', d.last_name) LIKE ?
      `;

      const searchValue = `%${search}%`;
      params.push(searchValue, searchValue, searchValue);
    }

    query += " ORDER BY mr.consultation_date DESC, mr.record_id DESC";

    const [records] = await pool.execute(query, params);

    return res.status(200).json({
      success: true,
      total: records.length,
      records
    });

  } catch (error) {
    console.error("Get medical records error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve medical records."
    });
  }
};

// ========================================
// GET MEDICAL RECORD BY ID
// ========================================

export const getMedicalRecordById = async (req, res) => {
  try {
    const recordId = Number(req.params.id);

    if (!Number.isInteger(recordId) || recordId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid medical record ID."
      });
    }

    const [records] = await pool.execute(
      `
        SELECT
          mr.record_id,
          mr.patient_id,
          mr.doctor_id,
          mr.appointment_id,
          mr.diagnosis,
          mr.prescription,
          mr.treatment,
          mr.remarks,
          DATE_FORMAT(mr.consultation_date, '%Y-%m-%d') AS consultation_date,
          mr.created_at,
          p.first_name AS patient_first_name,
          p.middle_name AS patient_middle_name,
          p.last_name AS patient_last_name,
          p.birth_date,
          p.sex,
          p.contact_number,
          p.address,
          TIMESTAMPDIFF(YEAR, p.birth_date, mr.consultation_date) AS patient_age,
          CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
          d.specialization AS doctor_specialization,
          s.service_name
        FROM medical_records mr
        INNER JOIN patients p ON mr.patient_id = p.patient_id
        INNER JOIN doctors d ON mr.doctor_id = d.doctor_id
        LEFT JOIN appointments a ON mr.appointment_id = a.appointment_id
        LEFT JOIN services s ON a.service_id = s.service_id
        WHERE mr.record_id = ?
      `,
      [recordId]
    );

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Medical record not found."
      });
    }

    return res.status(200).json({
      success: true,
      record: records[0]
    });

  } catch (error) {
    console.error("Get medical record by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve medical record details."
    });
  }
};

// ========================================
// GET COMPLETED APPOINTMENTS
// WITHOUT EXISTING MEDICAL RECORDS
// ========================================

export const getEligibleAppointments = async (req, res) => {
  try {
    const [appointments] = await pool.execute(
      `
        SELECT
          a.appointment_id,
          a.patient_id,
          a.doctor_id,
          a.service_id,
          DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
          TIME_FORMAT(a.appointment_time, '%H:%i:%s') AS appointment_time,
          a.reason,
          CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
          p.birth_date,
          p.sex,
          p.contact_number,
          p.address,
          TIMESTAMPDIFF(YEAR, p.birth_date, a.appointment_date) AS patient_age,
          CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
          d.specialization AS doctor_specialization,
          s.service_name
        FROM appointments a
        INNER JOIN patients p ON a.patient_id = p.patient_id
        INNER JOIN doctors d ON a.doctor_id = d.doctor_id
        INNER JOIN services s ON a.service_id = s.service_id
        LEFT JOIN medical_records mr
          ON a.appointment_id = mr.appointment_id
        WHERE a.status = 'Completed'
          AND mr.record_id IS NULL
        ORDER BY a.appointment_date DESC, a.appointment_time DESC
      `
    );

    return res.status(200).json({
      success: true,
      total: appointments.length,
      appointments
    });

  } catch (error) {
    console.error("Get eligible appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve completed appointments."
    });
  }
};

// ========================================
// CREATE MEDICAL RECORD
// BASED ON A COMPLETED APPOINTMENT
// ========================================

export const createMedicalRecord = async (req, res) => {
  let connection;

  try {
    const {
      appointment_id,
      diagnosis,
      prescription,
      treatment,
      remarks
    } = req.body;

    const appointmentId = Number(appointment_id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Please select a valid completed appointment."
      });
    }

    if (!diagnosis || typeof diagnosis !== "string" || !diagnosis.trim()) {
      return res.status(400).json({
        success: false,
        message: "Diagnosis is required."
      });
    }

    for (const [field, value] of Object.entries({
      prescription,
      treatment,
      remarks
    })) {
      if (value !== undefined && value !== null && typeof value !== "string") {
        return res.status(400).json({
          success: false,
          message: `${field} must be text.`
        });
      }
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    // Verify that the appointment exists and is completed.
    const [appointments] = await connection.execute(
      `
        SELECT
          appointment_id,
          patient_id,
          doctor_id,
          appointment_date,
          status
        FROM appointments
        WHERE appointment_id = ?
        FOR UPDATE
      `,
      [appointmentId]
    );

    if (appointments.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Appointment not found."
      });
    }

    const appointment = appointments[0];

    if (appointment.status !== "Completed") {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "Medical records can only be created for completed appointments."
      });
    }

    // Check whether a medical record already exists.
    const [existingRecords] = await connection.execute(
      `
        SELECT record_id
        FROM medical_records
        WHERE appointment_id = ?
        LIMIT 1
      `,
      [appointmentId]
    );

    if (existingRecords.length > 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "A medical record already exists for this appointment."
      });
    }

    // Automatically use the patient, doctor, and date
    // from the selected completed appointment.
    const [result] = await connection.execute(
      `
        INSERT INTO medical_records
          (
            patient_id,
            doctor_id,
            appointment_id,
            diagnosis,
            prescription,
            treatment,
            remarks,
            consultation_date
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        appointment.patient_id,
        appointment.doctor_id,
        appointment.appointment_id,
        diagnosis.trim(),
        prescription?.trim() || null,
        treatment?.trim() || null,
        remarks?.trim() || null,
        appointment.appointment_date
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Medical record created successfully.",
      recordId: result.insertId,
      appointmentId
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Medical record rollback error:", rollbackError);
      }
    }

    // Handles duplicate appointment_id constraint.
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({
        success: false,
        message: "A medical record already exists for this appointment."
      });
    }

    console.error("Create medical record error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create medical record."
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
};
