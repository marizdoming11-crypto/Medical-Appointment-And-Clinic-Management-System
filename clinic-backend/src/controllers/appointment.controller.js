
import pool from "../config/db.js";

// ========================================
// DATE VALIDATION
// ========================================

const isValidDate = (date) => {
  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return false;
  }

  const [year, month, day] = date.split("-").map(Number);
  const parsedDate = new Date(Date.UTC(year, month - 1, day));

  return (
    parsedDate.getUTCFullYear() === year &&
    parsedDate.getUTCMonth() === month - 1 &&
    parsedDate.getUTCDate() === day
  );
};

// ========================================
// GET ALL APPOINTMENTS
// SEARCH AND FILTER
// ========================================

export const getAllAppointments = async (req, res) => {
  try {
    const search = (req.query.search || "").trim();
    const status = (req.query.status || "").trim();
    const date = (req.query.date || "").trim();

    const conditions = [];
    const params = [];

    if (search) {
      conditions.push(`
        (
          CAST(a.appointment_id AS CHAR) LIKE ?
          OR CONCAT(p.first_name, ' ', p.last_name) LIKE ?
          OR CONCAT(d.first_name, ' ', d.last_name) LIKE ?
          OR s.service_name LIKE ?
        )
      `);

      const searchValue = `%${search}%`;
      params.push(searchValue, searchValue, searchValue, searchValue);
    }

    const allowedStatuses = [
      "Pending", "Approved", "Rejected", "Cancelled", "Completed"
    ];

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid appointment status."
        });
      }

      conditions.push("a.status = ?");
      params.push(status);
    }

    if (date) {
      if (!isValidDate(date)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date. Use YYYY-MM-DD."
        });
      }

      conditions.push("a.appointment_date = ?");
      params.push(date);
    }

    const whereClause = conditions.length
      ? `WHERE ${conditions.join(" AND ")}`
      : "";

    const [appointments] = await pool.execute(
      `
        SELECT
          a.appointment_id,
          a.patient_id,
          a.doctor_id,
          a.service_id,
          a.schedule_id,
          DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
          TIME_FORMAT(a.appointment_time, '%H:%i:%s') AS appointment_time,
          a.reason,
          a.status,
          a.admin_remarks,
          a.created_at,
          a.updated_at,
          CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
          p.contact_number AS patient_contact,
          u.email AS patient_email,
          CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
          d.specialization AS doctor_specialization,
          s.service_name
        FROM appointments a
        INNER JOIN patients p ON a.patient_id = p.patient_id
        LEFT JOIN users u ON p.user_id = u.user_id
        INNER JOIN doctors d ON a.doctor_id = d.doctor_id
        INNER JOIN services s ON a.service_id = s.service_id
        ${whereClause}
        ORDER BY
          CASE WHEN a.status = 'Pending' THEN 0 ELSE 1 END,
          a.appointment_date DESC,
          a.appointment_time DESC
      `,
      params
    );

    return res.status(200).json({
      success: true,
      total: appointments.length,
      appointments
    });

  } catch (error) {
    console.error("Get appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve appointments."
    });
  }
};

// ========================================
// GET APPOINTMENT BY ID
// ========================================

export const getAppointmentById = async (req, res) => {
  try {
    const appointmentId = Number(req.params.id);

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID."
      });
    }

    const [appointments] = await pool.execute(
      `
        SELECT
          a.appointment_id,
          a.patient_id,
          a.doctor_id,
          a.service_id,
          a.schedule_id,
          DATE_FORMAT(a.appointment_date, '%Y-%m-%d') AS appointment_date,
          TIME_FORMAT(a.appointment_time, '%H:%i:%s') AS appointment_time,
          a.reason,
          a.status,
          a.admin_remarks,
          a.created_at,
          a.updated_at,
          p.first_name AS patient_first_name,
          p.middle_name AS patient_middle_name,
          p.last_name AS patient_last_name,
          p.contact_number AS patient_contact,
          u.email AS patient_email,
          d.first_name AS doctor_first_name,
          d.last_name AS doctor_last_name,
          d.specialization AS doctor_specialization,
          d.contact_number AS doctor_contact,
          d.email AS doctor_email,
          s.service_name,
          s.description AS service_description
        FROM appointments a
        INNER JOIN patients p ON a.patient_id = p.patient_id
        LEFT JOIN users u ON p.user_id = u.user_id
        INNER JOIN doctors d ON a.doctor_id = d.doctor_id
        INNER JOIN services s ON a.service_id = s.service_id
        WHERE a.appointment_id = ?
      `,
      [appointmentId]
    );

    if (appointments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Appointment not found."
      });
    }

    return res.status(200).json({
      success: true,
      appointment: appointments[0]
    });

  } catch (error) {
    console.error("Get appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to retrieve appointment details."
    });
  }
};

// ========================================
// UPDATE APPOINTMENT STATUS
// APPROVE / REJECT / CANCEL / COMPLETE
// ========================================

export const updateAppointmentStatus = async (req, res) => {
  let connection;

  try {
    const appointmentId = Number(req.params.id);
    const { status, admin_remarks } = req.body;

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID."
      });
    }

    const allowedStatuses = [
      "Approved", "Rejected", "Cancelled", "Completed"
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment status."
      });
    }

    if (
      admin_remarks !== undefined &&
      admin_remarks !== null &&
      typeof admin_remarks !== "string"
    ) {
      return res.status(400).json({
        success: false,
        message: "Administrator remarks must be text."
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [rows] = await connection.execute(
      `
        SELECT
          appointment_id,
  patient_id,
  doctor_id,
  schedule_id,
          DATE_FORMAT(appointment_date, '%Y-%m-%d') AS appointment_date,
          TIME_FORMAT(appointment_time, '%H:%i:%s') AS appointment_time,
          status,
          (SELECT p.user_id
           FROM patients p
           WHERE p.patient_id = appointments.patient_id) AS patient_user_id
        FROM appointments
        WHERE appointment_id = ?
        FOR UPDATE
      `,
      [appointmentId]
    );

    if (rows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Appointment not found."
      });
    }

    const appointment = rows[0];

    const allowedTransitions = {
      Pending: ["Approved", "Rejected", "Cancelled"],
      Approved: ["Cancelled", "Completed"],
      Rejected: [],
      Cancelled: [],
      Completed: []
    };

    if (!allowedTransitions[appointment.status]?.includes(status)) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: `Cannot change appointment status from ${appointment.status} to ${status}.`
      });
    }

    if (status === "Approved") {
      const [doctors] = await connection.execute(
        `
          SELECT doctor_id, status
          FROM doctors
          WHERE doctor_id = ?
          FOR UPDATE
        `,
        [appointment.doctor_id]
      );

      if (!doctors.length || doctors[0].status !== "Available") {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: "The assigned doctor is not available."
        });
      }

      if (appointment.schedule_id === null) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: "This appointment has no assigned doctor schedule and cannot be approved."
        });
      }

      const [schedules] = await connection.execute(
        `
          SELECT
            schedule_id,
            doctor_id,
            DATE_FORMAT(available_date, '%Y-%m-%d') AS available_date,
            TIME_FORMAT(start_time, '%H:%i:%s') AS start_time,
            TIME_FORMAT(end_time, '%H:%i:%s') AS end_time,
            status
          FROM schedules
          WHERE schedule_id = ?
          FOR UPDATE
        `,
        [appointment.schedule_id]
      );

      if (!schedules.length) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: "The assigned doctor schedule no longer exists."
        });
      }

      const schedule = schedules[0];

      if (
        Number(schedule.doctor_id) !== Number(appointment.doctor_id) ||
        schedule.available_date !== appointment.appointment_date ||
        schedule.status !== "Available" ||
        appointment.appointment_time < schedule.start_time ||
        appointment.appointment_time >= schedule.end_time
      ) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: "The appointment does not match an available doctor schedule."
        });
      }

      const [conflicts] = await connection.execute(
        `
          SELECT appointment_id
          FROM appointments
          WHERE doctor_id = ?
            AND appointment_date = ?
            AND appointment_time = ?
            AND status = 'Approved'
            AND appointment_id <> ?
          LIMIT 1
          FOR UPDATE
        `,
        [
          appointment.doctor_id,
          appointment.appointment_date,
          appointment.appointment_time,
          appointmentId
        ]
      );

      if (conflicts.length > 0) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: "This doctor already has an approved appointment at the selected date and time."
        });
      }
    }

    await connection.execute(
      `
        UPDATE appointments
        SET status = ?, admin_remarks = ?
        WHERE appointment_id = ?
      `,
      [
        status,
        admin_remarks?.trim() || null,
        appointmentId
      ]
    );

    // Notify the patient about the admin's status update.
    if (appointment.patient_user_id) {
      const notificationMessages = {
        Approved: `Your appointment #${appointmentId} has been approved.`,
        Rejected: `Your appointment #${appointmentId} has been rejected.${admin_remarks?.trim() ? ` Admin remarks: ${admin_remarks.trim()}` : ""}`,
        Cancelled: `Your appointment #${appointmentId} has been cancelled.`,
        Completed: `Your appointment #${appointmentId} has been marked as completed.`
      };

      await connection.execute(
        `INSERT INTO notifications
          (user_id, title, message, is_read, created_at)
         VALUES (?, ?, ?, 0, NOW())`,
        [
          appointment.patient_user_id,
          `Appointment ${status}`,
          notificationMessages[status]
        ]
      );
    }

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Appointment ${status.toLowerCase()} successfully.`,
      appointmentId,
      status
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Appointment rollback error:", rollbackError);
      }
    }

    console.error("Update appointment status error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update appointment status."
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// ========================================
// GET APPOINTMENT FORM OPTIONS
// ========================================

export const getAppointmentFormOptions = async (req, res) => {
  try {
    const [patients] = await pool.execute(`
      SELECT
        patient_id,
        first_name,
        middle_name,
        last_name,
        contact_number
      FROM patients
      ORDER BY first_name, last_name
    `);

    const [doctors] = await pool.execute(`
      SELECT
        doctor_id,
        first_name,
        last_name,
        specialization,
        status
      FROM doctors
      ORDER BY first_name, last_name
    `);

    const [services] = await pool.execute(`
      SELECT service_id, service_name
      FROM services
      WHERE status = 'Active'
      ORDER BY service_name
    `);

    return res.status(200).json({
      success: true,
      patients,
      doctors,
      services
    });

  } catch (error) {
    console.error("Get appointment form options error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load appointment form options."
    });
  }
};

// ========================================
// CREATE APPOINTMENT
// ADMIN / WALK-IN
// ========================================

export const createAppointment = async (req, res) => {
  let connection;

  try {
    const {
      patient_type,
      patient_id,
      patient,
      doctor_id,
      service_id,
      appointment_date,
      appointment_time,
      reason
    } = req.body;

    const doctorId = Number(doctor_id);
    const serviceId = Number(service_id);

    if (!["existing", "walkin"].includes(patient_type)) {
      return res.status(400).json({
        success: false,
        message: "Choose an existing patient or a new walk-in patient."
      });
    }

    if (
      !Number.isInteger(doctorId) ||
      doctorId <= 0 ||
      !Number.isInteger(serviceId) ||
      serviceId <= 0
    ) {
      return res.status(400).json({
        success: false,
        message: "A valid doctor and service are required."
      });
    }

    if (!isValidDate(appointment_date)) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid appointment date."
      });
    }

    if (!/^(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d)?$/.test(appointment_time || "")) {
      return res.status(400).json({
        success: false,
        message: "Enter a valid appointment time."
      });
    }

    if (reason != null && typeof reason !== "string") {
      return res.status(400).json({
        success: false,
        message: "Reason for visit must be text."
      });
    }

    const normalizedTime = appointment_time.length === 5
      ? `${appointment_time}:00`
      : appointment_time;

    const requestedDateTime = new Date(
      `${appointment_date}T${normalizedTime}`
    );

    if (
      Number.isNaN(requestedDateTime.getTime()) ||
      requestedDateTime < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Appointment date and time cannot be in the past."
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    let finalPatientId;

    // EXISTING PATIENT
    if (patient_type === "existing") {
      finalPatientId = Number(patient_id);

      if (!Number.isInteger(finalPatientId) || finalPatientId <= 0) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: "Select a valid existing patient."
        });
      }

      const [patientRows] = await connection.execute(
        `
          SELECT patient_id
          FROM patients
          WHERE patient_id = ?
          FOR UPDATE
        `,
        [finalPatientId]
      );

      if (!patientRows.length) {
        await connection.rollback();

        return res.status(404).json({
          success: false,
          message: "Selected patient was not found."
        });
      }

    } else {
      // WALK-IN PATIENT
      const firstName = patient?.first_name?.trim();
      const middleName = patient?.middle_name?.trim() || null;
      const lastName = patient?.last_name?.trim();
      const contactNumber = patient?.contact_number?.trim();
      const birthDate = patient?.birth_date || null;
      const sex = patient?.sex || null;
      const address = patient?.address?.trim() || null;

      if (!firstName || !lastName) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: "Walk-in first name and last name are required."
        });
      }

      if (!/^09\d{9}$/.test(contactNumber || "")) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: "Walk-in contact number must contain 11 digits and start with 09."
        });
      }

      if (birthDate && !isValidDate(birthDate)) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: "Enter a valid patient birth date."
        });
      }

      if (sex && !["Male", "Female", "Other"].includes(sex)) {
        await connection.rollback();

        return res.status(400).json({
          success: false,
          message: "Invalid patient sex."
        });
      }

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
          VALUES (NULL, ?, ?, ?, ?, ?, ?, ?)
        `,
        [
          firstName,
          middleName,
          lastName,
          birthDate,
          sex,
          contactNumber,
          address
        ]
      );

      finalPatientId = patientResult.insertId;
    }

    // VALIDATE DOCTOR
    const [doctorRows] = await connection.execute(
      `
        SELECT doctor_id, status
        FROM doctors
        WHERE doctor_id = ?
        FOR UPDATE
      `,
      [doctorId]
    );

    if (!doctorRows.length || doctorRows[0].status !== "Available") {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "The selected doctor is not available."
      });
    }

    // VALIDATE SERVICE
    const [serviceRows] = await connection.execute(
      `
        SELECT service_id
        FROM services
        WHERE service_id = ? AND status = 'Active'
      `,
      [serviceId]
    );

    if (!serviceRows.length) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "The selected service is not active."
      });
    }

    // CHECK DOCTOR TIME CONFLICT
    const [conflicts] = await connection.execute(
      `
        SELECT appointment_id
        FROM appointments
        WHERE doctor_id = ?
          AND appointment_date = ?
          AND appointment_time = ?
          AND status = 'Approved'
        LIMIT 1
        FOR UPDATE
      `,
      [doctorId, appointment_date, normalizedTime]
    );

    if (conflicts.length) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "This doctor already has an approved appointment at the selected date and time."
      });
    }

    // FIND MATCHING DOCTOR SCHEDULE
    const [scheduleRows] = await connection.execute(
      `
        SELECT schedule_id, start_time, end_time, slot_duration
FROM schedules
        WHERE doctor_id = ?
          AND available_date = ?
          AND status = 'Available'
          AND start_time <= ?
          AND end_time > ?
        ORDER BY start_time
        LIMIT 1
        FOR UPDATE
      `,
      [doctorId, appointment_date, normalizedTime, normalizedTime]
    );

    // Reject appointment if no matching schedule exists.
    // This prevents appointments during lunch breaks and unavailable hours.
    if (scheduleRows.length === 0) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "The selected doctor has no available schedule at this date and time. Please choose a time within the doctor's available hours."
      });
    }

    const scheduleId = scheduleRows[0].schedule_id;

    // CREATE APPOINTMENT
    const [appointmentResult] = await connection.execute(
      `
        INSERT INTO appointments
          (
            patient_id,
            doctor_id,
            service_id,
            schedule_id,
            appointment_date,
            appointment_time,
            reason,
            status
          )
        VALUES (?, ?, ?, ?, ?, ?, ?, 'Approved')
      `,
      [
        finalPatientId,
        doctorId,
        serviceId,
        scheduleId,
        appointment_date,
        normalizedTime,
        reason?.trim() || null
      ]
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: patient_type === "walkin"
        ? "Walk-in patient and appointment created successfully."
        : "Appointment created successfully.",
      appointmentId: appointmentResult.insertId,
      patientId: finalPatientId,
      status: "Approved"
    });

  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackError) {
        console.error("Create appointment rollback error:", rollbackError);
      }
    }

    console.error("Create appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create appointment."
    });

  } finally {
    if (connection) {
      connection.release();
    }
  }
};
