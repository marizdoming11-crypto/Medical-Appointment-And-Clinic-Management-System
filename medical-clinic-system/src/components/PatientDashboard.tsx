import { useRef, useState, type FormEvent } from "react";
import "./PatientDashboard.css";

export type PatientUser = {
  user_id: number;
  email: string;
  role: "patient";
  patient: {
    patient_id: number;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    birth_date: string | null;
    sex: string | null;
    contact_number: string | null;
    address: string | null;
  } | null;
};

type Doctor = {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialization: string;
  status: string;
};

type Appointment = {
  id: string;
  patientName: string;
  patientEmail: string;
  doctor: string;
  date: string;
  time: string;
  reason: string;
  status: string;
  service?: string;
};

type Service = {
  service_id: number;
  service_name: string;
  description: string | null;
};

type Schedule = {
  schedule_id: number;
  doctor_id: number;
  available_date: string;
  start_time: string;
  end_time: string;
  slot_duration: number;
};

type PatientNotification = {
  notification_id: number;
  title: string;
  message: string;
  is_read: number | boolean;
  created_at: string;
};

type MedicalRecord = {
  record_id: number;
  diagnosis: string;
  prescription: string | null;
  treatment: string | null;
  remarks: string | null;
  consultation_date: string;
  created_at?: string;
  doctor_name: string;
  specialization: string;
  service_name: string | null;
};

type Props = {
  user: PatientUser;
  token: string;
  doctors: Doctor[];
  doctorsLoading: boolean;
  services: Service[];
  schedules: Schedule[];
  bookingOptionsLoading: boolean;
  appointments: Appointment[];
  appointmentsLoading: boolean;
  portalError: string;
  medicalRecords: MedicalRecord[];
  medicalRecordsLoading: boolean;
  medicalRecordsError: string;
  onRefreshMedicalRecords: () => Promise<void>;
  notifications: PatientNotification[];
  notificationsLoading: boolean;
  notificationsError: string;
  onRefreshNotifications: () => Promise<void>;
  onMarkNotificationAsRead: (notificationId: number) => Promise<void>;
  onMarkAllNotificationsAsRead: () => Promise<void>;
  onLogout: () => void;
  onSubmitBooking: (event: FormEvent<HTMLFormElement>) => Promise<boolean>;
  onCancelAppointment: (appointmentId: string) => void;
};

type Page =
  | "Dashboard"
  | "Book Appointment"
  | "My Appointments"
  | "Medical Records"
  | "Notifications"
  | "My Profile";

export default function PatientDashboard({
  user,
  doctors,
  doctorsLoading,
  services,
  schedules,
  bookingOptionsLoading,
  appointments,
  appointmentsLoading,
  portalError,
  medicalRecords,
  medicalRecordsLoading,
  medicalRecordsError,
  onRefreshMedicalRecords,
  notifications,
  notificationsLoading,
  notificationsError,
  onRefreshNotifications,
  onMarkNotificationAsRead,
  onMarkAllNotificationsAsRead,
  onLogout,
  onSubmitBooking,
  onCancelAppointment,
}: Props) {
  const [activePage, setActivePage] = useState<Page>("Dashboard");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingNotice, setBookingNotice] = useState("");
  const [selectedDoctor, setSelectedDoctor] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const submitLock = useRef(false);

  async function handleBookingSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    // A ref blocks rapid repeated clicks before React can re-render.
    if (submitLock.current || isSubmitting) return;

    submitLock.current = true;
    setIsSubmitting(true);
    setBookingNotice("");

    const saved = await onSubmitBooking(event);

    if (saved) {
      setBookingNotice("Your appointment request was submitted and is Pending.");
      setActivePage("My Appointments");
    } else {
      setBookingNotice("The request was not submitted. Please check the message and try again.");
    }

    setIsSubmitting(false);
    submitLock.current = false;
  }

  function toMinutes(time: string) {
    const [hours, minutes] = time.split(":").map(Number);
    return hours * 60 + minutes;
  }

  function formatTime(totalMinutes: number) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    const suffix = hours >= 12 ? "PM" : "AM";
    const displayHour = hours % 12 || 12;
    return `${String(displayHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
  }

  const availableDates = Array.from(
    new Set(
      schedules
        .filter(schedule => String(schedule.doctor_id) === selectedDoctor)
        .map(schedule => schedule.available_date)
    )
  );

  const availableSlots = schedules
    .filter(
      schedule =>
        String(schedule.doctor_id) === selectedDoctor &&
        schedule.available_date === selectedDate
    )
    .flatMap(schedule => {
      const slots: Array<{ value: string; label: string }> = [];
      const start = toMinutes(schedule.start_time);
      const end = toMinutes(schedule.end_time);
      const duration = Number(schedule.slot_duration);

      if (!duration || duration <= 0) return slots;

      for (let time = start; time < end; time += duration) {
        const hours = String(Math.floor(time / 60)).padStart(2, "0");
        const minutes = String(time % 60).padStart(2, "0");
        const value = `${hours}:${minutes}`;

        slots.push({
          value: `${schedule.schedule_id}|${value}`,
          label: formatTime(time)
        });
      }

      return slots;
    });

  const unreadNotifications = notifications.filter(
    notification => !Boolean(Number(notification.is_read))
  ).length;

  const patient = user.patient;
  const fullName = patient
    ? `${patient.first_name} ${patient.last_name}`
    : user.email;

  const menuItems: Page[] = [
    "Dashboard",
    "Book Appointment",
    "My Appointments",
    "Medical Records",
    "Notifications",
    "My Profile",
  ];

  const goTo = (page: Page) => setActivePage(page);

  const renderContent = () => {
    switch (activePage) {
      case "Dashboard":
        return (
          <>
            <div className="patient-welcome">
              <div>
                <h1>Welcome, {patient?.first_name || "Patient"}!</h1>
                <p>
                  Welcome to your MediCare Patient Dashboard.
                  Manage your appointments and personal information here.
                </p>
              </div>
              <div className="welcome-icon">✚</div>
            </div>

            <h2 className="section-heading">Overview</h2>

            <div className="patient-stat-grid">
              <button
                className="patient-stat-card stat-card-button"
                onClick={() => goTo("My Appointments")}
                type="button"
              >
                <span className="stat-icon blue">▣</span>
                <div>
                  <h3>My Appointments</h3>
                  <p>{appointments.length}</p>
                  <small>Appointment requests</small>
                </div>
              </button>

              <button
                className="patient-stat-card stat-card-button"
                onClick={() => goTo("Medical Records")}
                type="button"
              >
                <span className="stat-icon green">▤</span>
                <div>
                  <h3>Medical Records</h3>
                  <p>{medicalRecords.length}</p>
                  <small>Available consultation records</small>
                </div>
              </button>

              <button
                className="patient-stat-card stat-card-button"
                onClick={() => goTo("Notifications")}
                type="button"
              >
                <span className="stat-icon orange">♢</span>
                <div>
                  <h3>Notifications</h3>
                  <p>{unreadNotifications}</p>
                  <small>Unread notifications</small>
                </div>
              </button>
            </div>

            <div className="patient-content-card">
              <h2>Quick Actions</h2>
              <p>
                Request a clinic visit or review your existing appointment requests.
              </p>
              <div className="patient-quick-actions">
                <button
                  className="patient-primary-btn"
                  onClick={() => goTo("Book Appointment")}
                  type="button"
                >
                  + Book an Appointment
                </button>
                <button
                  className="patient-secondary-btn"
                  onClick={() => goTo("My Appointments")}
                  type="button"
                >
                  View My Appointments
                </button>
              </div>
            </div>
          </>
        );

      case "Book Appointment":
        return (
          <div className="patient-content-card">
            <div className="patient-page-header">
              <div>
                <h1>Book an Appointment</h1>
                <p>Complete the form to request a visit with one of our doctors.</p>
              </div>
            </div>

            <form className="patient-booking-form" onSubmit={handleBookingSubmit}>
              <label>
                Patient Name
                <input value={fullName} readOnly />
              </label>

              <label>
                Email Address
                <input value={user.email} readOnly />
              </label>

              <label>
                Select Service
                <select name="service" defaultValue="" required disabled={bookingOptionsLoading}>
                  <option value="" disabled>
                    {bookingOptionsLoading ? "Loading services..." : "Select a service"}
                  </option>
                  {services.map(service => (
                    <option key={service.service_id} value={service.service_id}>
                      {service.service_name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Select Doctor
                <select
                  name="doctor"
                  value={selectedDoctor}
                  required
                  disabled={bookingOptionsLoading || doctorsLoading}
                  onChange={event => {
                    setSelectedDoctor(event.target.value);
                    setSelectedDate("");
                  }}
                >
                  <option value="">
                    {bookingOptionsLoading || doctorsLoading ? "Loading doctors..." : "Select a doctor"}
                  </option>
                  {doctors.map(doctor => (
                    <option key={doctor.doctor_id} value={doctor.doctor_id}>
                      Dr. {doctor.first_name} {doctor.last_name} - {doctor.specialization}
                    </option>
                  ))}
                </select>
                {!bookingOptionsLoading && doctors.length === 0 && (
                  <small className="booking-hint">
                    No available doctors are currently listed.
                  </small>
                )}
              </label>

              <div className="patient-booking-row">
                <label>
                  Preferred Date
                  <select
                    name="date"
                    value={selectedDate}
                    required
                    disabled={!selectedDoctor || bookingOptionsLoading}
                    onChange={event => setSelectedDate(event.target.value)}
                  >
                    <option value="">Select an available date</option>
                    {availableDates.map(date => (
                      <option key={date} value={date}>{date}</option>
                    ))}
                  </select>
                </label>

                <label>
                  Preferred Time
                  <select name="slot" defaultValue="" required disabled={!selectedDate}>
                    <option value="">Select an available time</option>
                    {availableSlots.map(slot => (
                      <option key={slot.value} value={slot.value}>
                        {slot.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {selectedDoctor && selectedDate && availableSlots.length === 0 && (
                <small className="booking-hint">
                  No available time slots for this date. Please choose another date.
                </small>
              )}

              <label>
                Reason for Appointment
                <textarea
                  name="reason"
                  placeholder="Briefly describe your reason for visiting"
                  required
                />
              </label>

              <div className="booking-form-actions">
                <button
                  className="patient-primary-btn"
                  type="submit"
                  disabled={
                    bookingOptionsLoading ||
                    doctorsLoading ||
                    services.length === 0 ||
                    doctors.length === 0 ||
                    availableSlots.length === 0 ||
                    isSubmitting
                  }
                >
                  {isSubmitting ? "Submitting..." : "Submit Appointment Request"}
                </button>
                {bookingNotice && (
                  <p className="booking-feedback" role="status">
                    {bookingNotice}
                  </p>
                )}
                {portalError && (
                  <p className="booking-feedback" role="alert">
                    {portalError}
                  </p>
                )}
                <small className="booking-hint">
                  Your request will be saved to your account and marked Pending for clinic review.
                </small>
              </div>
            </form>
          </div>
        );

      case "My Appointments":
        return (
          <div className="patient-content-card">
            <h1>My Appointments</h1>
            <p>Review the appointment requests saved to your patient account.</p>

            {appointmentsLoading ? (
              <div className="patient-empty-state">
                <h3>Loading your appointments...</h3>
              </div>
            ) : appointments.length === 0 ? (
              <div className="patient-empty-state">
                <div className="empty-icon">▣</div>
                <h3>No Appointment Requests Yet</h3>
                <p>You have not submitted any appointment requests yet.</p>
                <button
                  className="patient-primary-btn"
                  onClick={() => goTo("Book Appointment")}
                  type="button"
                >
                  Book an Appointment
                </button>
              </div>
            ) : (
              <div className="patient-appointment-list">
                {appointments.map((appointment) => (
                  <article className="patient-appointment-card" key={appointment.id}>
                    <div className="appointment-card-heading">
                      <strong>{appointment.doctor}</strong>
                      <span className="appointment-status">{appointment.status}</span>
                    </div>
                    <p><strong>Date:</strong> {appointment.date}</p>
                    <p><strong>Time:</strong> {appointment.time}</p>
                    {appointment.service && (
                      <p><strong>Service:</strong> {appointment.service}</p>
                    )}
                    <p><strong>Reason:</strong> {appointment.reason}</p>
                    {appointment.status === "Pending" && (
                      <button
                        className="patient-cancel-btn"
                        type="button"
                        onClick={() => {
                          const confirmed = window.confirm(
                            "Are you sure you want to cancel this pending appointment request?"
                          );
                          if (confirmed) onCancelAppointment(appointment.id);
                        }}
                      >
                        Cancel Appointment
                      </button>
                    )}
                  </article>
                ))}
              </div>
            )}
          </div>
        );

      case "Medical Records":
        return (
          <div className="patient-content-card">
            <div className="patient-page-header">
              <div>
                <h1>Medical Records</h1>
                <p>View consultation findings and treatment information added by your clinic.</p>
              </div>
              <button
                className="patient-secondary-btn"
                type="button"
                onClick={onRefreshMedicalRecords}
                disabled={medicalRecordsLoading}
              >
                {medicalRecordsLoading ? "Refreshing..." : "Refresh Records"}
              </button>
            </div>

            {medicalRecordsError && (
              <p className="booking-feedback" role="alert">{medicalRecordsError}</p>
            )}

            {medicalRecordsLoading ? (
              <div className="patient-empty-state">
                <h3>Loading Medical Records...</h3>
                <p>Please wait while your records are retrieved.</p>
              </div>
            ) : medicalRecords.length === 0 ? (
              <div className="patient-empty-state">
                <div className="empty-icon">▤</div>
                <h3>No Medical Records Available</h3>
                <p>Your medical records will appear here after the clinic adds a consultation record to your account.</p>
              </div>
            ) : (
              <div className="patient-appointment-list">
                {medicalRecords.map((record) => (
                  <article className="patient-appointment-card" key={record.record_id}>
                    <div className="appointment-card-heading">
                      <strong>Consultation Record #{record.record_id}</strong>
                      <span className="appointment-status">{record.consultation_date?.slice(0, 10) || "Date not available"}</span>
                    </div>
                    <p><strong>Doctor:</strong> {record.doctor_name}</p>
                    <p><strong>Specialization:</strong> {record.specialization}</p>
                    {record.service_name && (
                      <p><strong>Service:</strong> {record.service_name}</p>
                    )}
                    <p><strong>Diagnosis:</strong> {record.diagnosis}</p>
                    <p><strong>Prescription:</strong> {record.prescription || "Not provided"}</p>
                    <p><strong>Treatment:</strong> {record.treatment || "Not provided"}</p>
                    <p><strong>Remarks:</strong> {record.remarks || "None"}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        );

      case "Notifications":
        return (
          <div className="patient-content-card">
            <div className="patient-page-header">
              <div>
                <h1>Notifications</h1>
                <p>Stay updated with appointment changes from the clinic.</p>
                <small>{unreadNotifications} unread notification(s)</small>
              </div>
              <div className="patient-quick-actions">
                <button
                  className="patient-secondary-btn"
                  type="button"
                  onClick={onRefreshNotifications}
                  disabled={notificationsLoading}
                >
                  {notificationsLoading ? "Refreshing..." : "Refresh"}
                </button>
                {unreadNotifications > 0 && (
                  <button
                    className="patient-primary-btn"
                    type="button"
                    onClick={onMarkAllNotificationsAsRead}
                  >
                    Mark All as Read
                  </button>
                )}
              </div>
            </div>

            {notificationsError && (
              <p className="booking-feedback" role="alert">{notificationsError}</p>
            )}

            {notificationsLoading ? (
              <div className="patient-empty-state">
                <h3>Loading notifications...</h3>
              </div>
            ) : notifications.length === 0 ? (
              <div className="patient-empty-state">
                <div className="empty-icon">♢</div>
                <h3>No Notifications Yet</h3>
                <p>You will see appointment updates here when the clinic reviews your requests.</p>
              </div>
            ) : (
              <div className="patient-appointment-list">
                {notifications.map(notification => {
                  const isUnread = !Boolean(Number(notification.is_read));

                  return (
                    <article
                      className="patient-appointment-card"
                      key={notification.notification_id}
                      style={{
                        borderLeft: isUnread ? "4px solid #2563eb" : "4px solid #d1d5db",
                        background: isUnread ? "#f8fbff" : "#ffffff"
                      }}
                    >
                      <div className="appointment-card-heading">
                        <strong>{notification.title}</strong>
                        <span className="appointment-status">
                          {isUnread ? "Unread" : "Read"}
                        </span>
                      </div>
                      <p>{notification.message}</p>
                      <small>
                        {notification.created_at
                          ? new Date(notification.created_at).toLocaleString()
                          : ""}
                      </small>
                      {isUnread && (
                        <button
                          className="patient-secondary-btn"
                          type="button"
                          onClick={() => onMarkNotificationAsRead(notification.notification_id)}
                        >
                          Mark as Read
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </div>
        );

      case "My Profile":
        return (
          <div className="patient-content-card">
            <h1>My Profile</h1>
            <p>View your registered personal information.</p>

            <div className="patient-profile-card">
              <div className="patient-avatar">
                {patient?.first_name?.charAt(0).toUpperCase() || "P"}
              </div>
              <h2>{fullName}</h2>
              <span className="patient-role">Patient Account</span>

              <div className="patient-profile-details">
                <div><label>First Name</label><p>{patient?.first_name || "Not provided"}</p></div>
                <div><label>Middle Name</label><p>{patient?.middle_name || "Not provided"}</p></div>
                <div><label>Last Name</label><p>{patient?.last_name || "Not provided"}</p></div>
                <div><label>Email Address</label><p>{user.email}</p></div>
                <div><label>Birth Date</label><p>{patient?.birth_date || "Not provided"}</p></div>
                <div><label>Sex</label><p>{patient?.sex || "Not provided"}</p></div>
                <div><label>Contact Number</label><p>{patient?.contact_number || "Not provided"}</p></div>
                <div><label>Address</label><p>{patient?.address || "Not provided"}</p></div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="patient-dashboard-layout">
      <aside className="patient-sidebar">
        <div className="patient-brand">
          <div className="patient-brand-icon">✚</div>
          <div>
            <h2>MediCare</h2>
            <span>Patient Portal</span>
          </div>
        </div>

        <div className="patient-sidebar-label">MENU</div>

        <nav className="patient-navigation">
          {menuItems.map((item) => (
            <button
              key={item}
              className={`patient-nav-item ${activePage === item ? "active" : ""}`}
              onClick={() => goTo(item)}
              type="button"
            >
              <span className="nav-indicator">
                {item === "Dashboard" && "⌂"}
                {item === "Book Appointment" && "＋"}
                {item === "My Appointments" && "▣"}
                {item === "Medical Records" && "▤"}
                {item === "Notifications" && "♢"}
                {item === "My Profile" && "◉"}
              </span>
              {item}
              {item === "Notifications" && unreadNotifications > 0 && (
                <span
                  style={{
                    marginLeft: "auto",
                    minWidth: 20,
                    padding: "2px 6px",
                    borderRadius: 999,
                    background: "#dc2626",
                    color: "#ffffff",
                    fontSize: 11,
                    textAlign: "center"
                  }}
                >
                  {unreadNotifications}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="patient-sidebar-bottom">
          <div className="sidebar-help">
            <strong>Need assistance?</strong>
            <p>Contact the clinic for help with your account.</p>
          </div>
          <button className="patient-logout-btn" onClick={onLogout} type="button">
            <span>↪</span> Logout
          </button>
        </div>
      </aside>

      <main className="patient-main">
        <header className="patient-topbar">
          <div>
            <span className="topbar-label">PATIENT PORTAL</span>
            <h2>{activePage}</h2>
          </div>
          <div className="patient-topbar-user">
            <div className="topbar-avatar">
              {patient?.first_name?.charAt(0).toUpperCase() || "P"}
            </div>
            <div>
              <strong>{fullName}</strong>
              <span>Patient</span>
            </div>
          </div>
        </header>

        <section className="patient-page-content">{renderContent()}</section>
      </main>
    </div>
  );
}
