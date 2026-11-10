
import pool from "../config/db.js";

// ========================================
// GET ALL APPOINTMENTS / SEARCH / FILTER
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

      params.push(
        searchValue,
        searchValue,
        searchValue,
        searchValue
      );
    }

    const allowedStatuses = [
      "Pending",
      "Approved",
      "Rejected",
      "Cancelled",
      "Completed"
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
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD."
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
          a.appointment_date,
          a.appointment_time,
          a.reason,
          a.status,
          a.admin_remarks,
          a.created_at,
          a.updated_at,

          CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
          p.contact_number AS patient_contact,

          CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
          d.specialization AS doctor_specialization,

          s.service_name

        FROM appointments a

        INNER JOIN patients p
          ON a.patient_id = p.patient_id

        INNER JOIN doctors d
          ON a.doctor_id = d.doctor_id

        INNER JOIN services s
          ON a.service_id = s.service_id

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
          a.appointment_date,
          a.appointment_time,
          a.reason,
          a.status,
          a.admin_remarks,
          a.created_at,
          a.updated_at,

          p.first_name AS patient_first_name,
          p.middle_name AS patient_middle_name,
          p.last_name AS patient_last_name,
          p.contact_number AS patient_contact,
          p.email AS patient_email,

          d.first_name AS doctor_first_name,
          d.last_name AS doctor_last_name,
          d.specialization AS doctor_specialization,
          d.contact_number AS doctor_contact,
          d.email AS doctor_email,

          s.service_name,
          s.description AS service_description

        FROM appointments a

        INNER JOIN patients p
          ON a.patient_id = p.patient_id

        INNER JOIN doctors d
          ON a.doctor_id = d.doctor_id

        INNER JOIN services s
          ON a.service_id = s.service_id

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
      "Approved",
      "Rejected",
      "Cancelled",
      "Completed"
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

    // Lock the appointment while processing the status update.
    const [rows] = await connection.execute(
      `
        SELECT
          appointment_id,
          doctor_id,
          schedule_id,
          appointment_date,
          appointment_time,
          status
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

    // Define allowed status transitions.
    const allowedTransitions = {
      Pending: ["Approved", "Rejected", "Cancelled"],
      Approved: ["Cancelled", "Completed"],
      Rejected: [],
      Cancelled: [],
      Completed: []
    };

    if (
      !allowedTransitions[appointment.status]?.includes(status)
    ) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: `Cannot change appointment status from ${appointment.status} to ${status}.`
      });
    }

    // Validate the doctor before approving.
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

      if (
        doctors.length === 0 ||
        doctors[0].status !== "Available"
      ) {
        await connection.rollback();

        return res.status(409).json({
          success: false,
          message: "The assigned doctor is not available."
        });
      }

      // If a schedule is assigned, verify its availability.
      if (appointment.schedule_id !== null) {
        const [schedules] = await connection.execute(
          `
            SELECT
              schedule_id,
              doctor_id,
              available_date,
              start_time,
              end_time,
              status
            FROM schedules
            WHERE schedule_id = ?
            FOR UPDATE
          `,
          [appointment.schedule_id]
        );

        if (schedules.length === 0) {
          await connection.rollback();

          return res.status(409).json({
            success: false,
            message: "The assigned doctor schedule no longer exists."
          });
        }

        const schedule = schedules[0];

        const appointmentTime = String(
          appointment.appointment_time
        );

        if (
          Number(schedule.doctor_id) !==
            Number(appointment.doctor_id) ||
          String(schedule.available_date).slice(0, 10) !==
            String(appointment.appointment_date).slice(0, 10) ||
          schedule.status !== "Available" ||
          appointmentTime < String(schedule.start_time) ||
          appointmentTime >= String(schedule.end_time)
        ) {
          await connection.rollback();

          return res.status(409).json({
            success: false,
            message: "The appointment does not match an available doctor schedule."
          });
        }
      }

      // Prevent another approved appointment at the same time.
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
        SET
          status = ?,
          admin_remarks = ?
        WHERE appointment_id = ?
      `,
      [
        status,
        admin_remarks?.trim() || null,
        appointmentId
      ]
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: `Appointment ${status.toLowerCase()} successfully.`,
      appointmentId,
      status
    });
  } catch (error) {
    if (connection) {
      await connection.rollback();
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
