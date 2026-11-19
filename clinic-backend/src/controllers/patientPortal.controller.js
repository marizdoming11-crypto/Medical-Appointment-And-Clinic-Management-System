
import pool from "../config/db.js";

// ========================================
// HELPER FUNCTIONS
// ========================================

const getUserId = (req) => {
  const userId = req.user?.userId ?? req.user?.user_id;
  const parsedId = Number(userId);

  return Number.isInteger(parsedId) && parsedId > 0
    ? parsedId
    : null;
};

const getPatientId = async (userId, connection = pool) => {
  const [rows] = await connection.execute(
    `SELECT patient_id FROM patients WHERE user_id = ? LIMIT 1`,
    [userId]
  );

  return rows.length ? rows[0].patient_id : null;
};

const isValidDate = (date) => {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    !Number.isNaN(Date.parse(`${date}T00:00:00`));
};

const isValidTime = (time) => {
  return /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/.test(time);
};

const notifyPatient = async (connection, userId, title, message) => {
  await connection.execute(
    `INSERT INTO notifications (user_id, title, message, is_read, created_at)
     VALUES (?, ?, ?, 0, NOW())`,
    [userId, title, message]
  );
};

const notifyAdmins = async (connection, title, message) => {
  const [admins] = await connection.execute(
    `SELECT user_id FROM users
     WHERE role = 'admin' AND account_status = 'active'`
  );

  for (const admin of admins) {
    await connection.execute(
      `INSERT INTO notifications (user_id, title, message, is_read, created_at)
       VALUES (?, ?, ?, 0, NOW())`,
      [admin.user_id, title, message]
    );
  }
};

// ========================================
// GET PATIENT BOOKING OPTIONS
// ========================================

export const getMyBookingOptions = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient session."
      });
    }

    const patientId = await getPatientId(userId);

    if (!patientId) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found."
      });
    }

    const [doctors] = await pool.execute(`
      SELECT doctor_id, first_name, last_name, specialization
      FROM doctors
      WHERE status = 'Available'
      ORDER BY first_name, last_name
    `);

    const [services] = await pool.execute(`
      SELECT service_id, service_name, description
      FROM services
      WHERE status = 'Active'
      ORDER BY service_name
    `);

    const [schedules] = await pool.execute(`
      SELECT
        s.schedule_id,
        s.doctor_id,
        DATE_FORMAT(s.available_date, '%Y-%m-%d') AS available_date,
        TIME_FORMAT(s.start_time, '%H:%i:%s') AS start_time,
        TIME_FORMAT(s.end_time, '%H:%i:%s') AS end_time,
        s.slot_duration
      FROM schedules s
      INNER JOIN doctors d ON d.doctor_id = s.doctor_id
      WHERE s.status = 'Available'
        AND d.status = 'Available'
        AND s.available_date >= CURDATE()
      ORDER BY s.available_date, s.start_time
    `);

    return res.status(200).json({
      success: true,
      doctors,
      services,
      schedules
    });

  } catch (error) {
    console.error("Get booking options error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load booking options."
    });
  }
};

// ========================================
// CREATE PATIENT APPOINTMENT
// ========================================

export const createMyAppointment = async (req, res) => {
  let connection;

  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient session."
      });
    }

    const {
      doctor_id,
      service_id,
      schedule_id,
      appointment_date,
      appointment_time,
      reason
    } = req.body;

    const doctorId = Number(doctor_id);
    const serviceId = Number(service_id);
    const scheduleId = Number(schedule_id);

    if (
      !Number.isInteger(doctorId) || doctorId <= 0 ||
      !Number.isInteger(serviceId) || serviceId <= 0 ||
      !Number.isInteger(scheduleId) || scheduleId <= 0 ||
      !isValidDate(appointment_date) ||
      !isValidTime(appointment_time) ||
      !reason?.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide valid appointment details."
      });
    }

    const patientId = await getPatientId(userId);

    if (!patientId) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found."
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [doctors] = await connection.execute(
      `SELECT doctor_id FROM doctors
       WHERE doctor_id = ? AND status = 'Available'`,
      [doctorId]
    );

    if (!doctors.length) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Selected doctor is not available."
      });
    }

    const [services] = await connection.execute(
      `SELECT service_id FROM services
       WHERE service_id = ? AND status = 'Active'`,
      [serviceId]
    );

    if (!services.length) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Selected service is not available."
      });
    }

    const [schedules] = await connection.execute(
      `SELECT
         schedule_id,
         doctor_id,
         available_date,
         start_time,
         end_time,
         slot_duration
       FROM schedules
       WHERE schedule_id = ?
         AND doctor_id = ?
         AND available_date = ?
         AND status = 'Available'
       FOR UPDATE`,
      [scheduleId, doctorId, appointment_date]
    );

    if (!schedules.length) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Selected schedule is no longer available."
      });
    }

    const schedule = schedules[0];
    const time = appointment_time.length === 5
      ? `${appointment_time}:00`
      : appointment_time;

    const [slotCheck] = await connection.execute(
      `SELECT
         (
           TIME_TO_SEC(?) >= TIME_TO_SEC(?)
           AND TIME_TO_SEC(?) < TIME_TO_SEC(?)
           AND MOD(
             TIME_TO_SEC(TIMEDIFF(?, ?)),
             ? * 60
           ) = 0
         ) AS valid_slot,
         (TIMESTAMP(?, ?) > NOW()) AS future_slot`,
      [
        time,
        schedule.start_time,
        time,
        schedule.end_time,
        time,
        schedule.start_time,
        schedule.slot_duration,
        appointment_date,
        time
      ]
    );

    if (!slotCheck[0].valid_slot || !slotCheck[0].future_slot) {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Please select a valid future appointment time."
      });
    }

    const [conflicts] = await connection.execute(
      `SELECT appointment_id
       FROM appointments
       WHERE doctor_id = ?
         AND appointment_date = ?
         AND appointment_time = ?
         AND status IN ('Pending', 'Approved')
       LIMIT 1`,
      [doctorId, appointment_date, time]
    );

    if (conflicts.length) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "This appointment slot has already been booked."
      });
    }

    const [patientConflicts] = await connection.execute(
      `SELECT appointment_id
       FROM appointments
       WHERE patient_id = ?
         AND appointment_date = ?
         AND appointment_time = ?
         AND status IN ('Pending', 'Approved')
       LIMIT 1`,
      [patientId, appointment_date, time]
    );

    if (patientConflicts.length) {
      await connection.rollback();

      return res.status(409).json({
        success: false,
        message: "You already have an appointment at this time."
      });
    }

    const [result] = await connection.execute(
      `INSERT INTO appointments
       (
         patient_id,
         doctor_id,
         service_id,
         schedule_id,
         appointment_date,
         appointment_time,
         reason,
         status,
         created_at,
         updated_at
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', NOW(), NOW())`,
      [
        patientId,
        doctorId,
        serviceId,
        scheduleId,
        appointment_date,
        time,
        reason.trim()
      ]
    );

    await notifyPatient(
      connection,
      userId,
      "Appointment Submitted",
      "Your appointment request has been submitted and is awaiting admin approval."
    );

    await notifyAdmins(
      connection,
      "New Appointment Request",
      `A patient has submitted appointment request #${result.insertId}. Please review it in the Appointments section.`
    );

    await connection.commit();

    return res.status(201).json({
      success: true,
      message: "Appointment submitted successfully.",
      appointment_id: result.insertId
    });

  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Create patient appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to create appointment."
    });

  } finally {
    if (connection) connection.release();
  }
};

// ========================================
// GET PATIENT APPOINTMENTS
// ========================================

export const getMyAppointments = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient session."
      });
    }

    const patientId = await getPatientId(userId);

    if (!patientId) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found."
      });
    }

    const [appointments] = await pool.execute(
      `SELECT
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
         d.first_name AS doctor_first_name,
         d.last_name AS doctor_last_name,
         d.specialization,
         s.service_name
       FROM appointments a
       INNER JOIN doctors d ON d.doctor_id = a.doctor_id
       INNER JOIN services s ON s.service_id = a.service_id
       WHERE a.patient_id = ?
       ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      [patientId]
    );

    return res.status(200).json({
      success: true,
      appointments
    });

  } catch (error) {
    console.error("Get patient appointments error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load appointments."
    });
  }
};

// ========================================
// CANCEL PATIENT APPOINTMENT
// ========================================

export const cancelMyAppointment = async (req, res) => {
  let connection;

  try {
    const userId = getUserId(req);
    const appointmentId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient session."
      });
    }

    if (!Number.isInteger(appointmentId) || appointmentId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid appointment ID."
      });
    }

    const patientId = await getPatientId(userId);

    if (!patientId) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found."
      });
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [appointments] = await connection.execute(
      `SELECT appointment_id, status
       FROM appointments
       WHERE appointment_id = ? AND patient_id = ?
       FOR UPDATE`,
      [appointmentId, patientId]
    );

    if (!appointments.length) {
      await connection.rollback();

      return res.status(404).json({
        success: false,
        message: "Appointment not found."
      });
    }

    if (appointments[0].status !== "Pending") {
      await connection.rollback();

      return res.status(400).json({
        success: false,
        message: "Only pending appointments can be cancelled."
      });
    }

    await connection.execute(
      `UPDATE appointments
       SET status = 'Cancelled', updated_at = NOW()
       WHERE appointment_id = ? AND patient_id = ?`,
      [appointmentId, patientId]
    );

    await notifyPatient(
      connection,
      userId,
      "Appointment Cancelled",
      `Your appointment #${appointmentId} has been cancelled.`
    );

    await notifyAdmins(
      connection,
      "Appointment Cancelled",
      `A patient cancelled appointment #${appointmentId}.`
    );

    await connection.commit();

    return res.status(200).json({
      success: true,
      message: "Appointment cancelled successfully."
    });

  } catch (error) {
    if (connection) await connection.rollback();

    console.error("Cancel patient appointment error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to cancel appointment."
    });

  } finally {
    if (connection) connection.release();
  }
};

// ========================================
// GET PATIENT MEDICAL RECORDS
// ========================================

export const getMyMedicalRecords = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient session."
      });
    }

    const patientId = await getPatientId(userId);

    if (!patientId) {
      return res.status(404).json({
        success: false,
        message: "Patient profile not found."
      });
    }

    const [records] = await pool.execute(
      `SELECT
         mr.record_id,
         mr.patient_id,
         mr.doctor_id,
         mr.appointment_id,
         mr.diagnosis,
         mr.prescription,
         mr.treatment,
         mr.remarks,
         mr.consultation_date,
         mr.created_at,
         CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
         d.specialization,
         s.service_name
       FROM medical_records mr
       INNER JOIN doctors d ON d.doctor_id = mr.doctor_id
       LEFT JOIN appointments a ON a.appointment_id = mr.appointment_id
       LEFT JOIN services s ON s.service_id = a.service_id
       WHERE mr.patient_id = ?
       ORDER BY mr.consultation_date DESC, mr.created_at DESC`,
      [patientId]
    );

    return res.status(200).json({
      success: true,
      records
    });

  } catch (error) {
    console.error("Get patient medical records error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load medical records."
    });
  }
};

// ========================================
// GET PATIENT NOTIFICATIONS
// ========================================

export const getMyNotifications = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient session."
      });
    }

    const [notifications] = await pool.execute(
      `SELECT
         notification_id,
         user_id,
         title,
         message,
         is_read,
         created_at
       FROM notifications
       WHERE user_id = ?
       ORDER BY created_at DESC`,
      [userId]
    );

    const unreadCount = notifications.filter(
      (notification) => !notification.is_read
    ).length;

    return res.status(200).json({
      success: true,
      notifications,
      unreadCount
    });

  } catch (error) {
    console.error("Get patient notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load notifications."
    });
  }
};

// ========================================
// MARK ONE NOTIFICATION AS READ
// ========================================

export const markMyNotificationAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);
    const notificationId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient session."
      });
    }

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID."
      });
    }

    const [result] = await pool.execute(
      `UPDATE notifications
       SET is_read = 1
       WHERE notification_id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (!result.affectedRows) {
      return res.status(404).json({
        success: false,
        message: "Notification not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read."
    });

  } catch (error) {
    console.error("Mark patient notification as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notification."
    });
  }
};

// ========================================
// MARK ALL NOTIFICATIONS AS READ
// ========================================

export const markAllMyNotificationsAsRead = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid patient session."
      });
    }

    const [result] = await pool.execute(
      `UPDATE notifications
       SET is_read = 1
       WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    return res.status(200).json({
      success: true,
      message: "All notifications marked as read.",
      updatedCount: result.affectedRows
    });

  } catch (error) {
    console.error("Mark all patient notifications as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to update notifications."
    });
  }
};
