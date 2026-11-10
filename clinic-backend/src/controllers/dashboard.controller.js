import pool from "../config/db.js";

export const getDashboardOverview = async (req, res) => {
  try {
    const [
      [patients],
      [appointments],
      [doctors],
      [records],
      [upcomingAppointments]
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(*) AS totalPatients
        FROM patients
      `),

      pool.query(`
        SELECT COUNT(*) AS todaysAppointments
        FROM appointments
        WHERE appointment_date = CURDATE()
      `),

      pool.query(`
        SELECT COUNT(*) AS totalDoctors
        FROM doctors
      `),

      pool.query(`
        SELECT COUNT(*) AS totalRecords
        FROM medical_records
      `),

      pool.query(`
        SELECT
          a.appointment_id,
          CONCAT(p.first_name, ' ', p.last_name) AS patient_name,
          CONCAT(d.first_name, ' ', d.last_name) AS doctor_name,
          a.appointment_date,
          a.appointment_time,
          a.status
        FROM appointments a
        INNER JOIN patients p
          ON a.patient_id = p.patient_id
        INNER JOIN doctors d
          ON a.doctor_id = d.doctor_id
        WHERE a.appointment_date >= CURDATE()
          AND a.status IN ('Pending', 'Approved')
        ORDER BY
          a.appointment_date ASC,
          a.appointment_time ASC
        LIMIT 10
      `)
    ]);

    return res.status(200).json({
      success: true,
      statistics: {
        totalPatients: Number(patients[0].totalPatients),
        todaysAppointments: Number(appointments[0].todaysAppointments),
        totalDoctors: Number(doctors[0].totalDoctors),
        totalRecords: Number(records[0].totalRecords)
      },
      upcomingAppointments
    });

  } catch (error) {
    console.error("Dashboard overview error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve dashboard information."
    });
  }
};