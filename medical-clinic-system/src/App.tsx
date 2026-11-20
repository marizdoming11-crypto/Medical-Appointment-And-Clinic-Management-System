
import { useEffect, useState, type FormEvent } from "react";
import {
  CalendarDays,
  Heart,
  HeartPulse,
  Menu,
  Stethoscope,
  Syringe,
  UserRound,
  ArrowRight,
  MapPin,
  Phone,
  Mail,
  LogOut,
  ClipboardList,
  X,
  CheckCircle2,
  Activity,
  Clock
} from "lucide-react";

import "./App.css";
import PatientDashboard, { type PatientUser } from "./components/PatientDashboard";

// ==============================
// TYPES
// ==============================

type User = PatientUser;

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

type Doctor = {
  doctor_id: number;
  first_name: string;
  last_name: string;
  specialization: string;
  status: string;
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

type PatientPortalOptionsResponse = {
  success: boolean;
  message?: string;
  doctors: Omit<Doctor, "status">[];
  services: Service[];
  schedules: Schedule[];
};

type PatientAppointmentsResponse = {
  success: boolean;
  message?: string;
  appointments: Array<{
    appointment_id: number;
    appointment_date: string;
    appointment_time: string;
    reason: string;
    status: string;
    doctor_first_name: string;
    doctor_last_name: string;
    service_name: string;
  }>;
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

type PatientMedicalRecordsResponse = {
  success: boolean;
  message?: string;
  records: MedicalRecord[];
};

type PatientNotification = {
  notification_id: number;
  title: string;
  message: string;
  is_read: number | boolean;
  created_at: string;
};

type PatientNotificationsResponse = {
  success: boolean;
  message?: string;
  notifications: PatientNotification[];
};

type DoctorsResponse = {
  success: boolean;
  total?: number;
  doctors: Doctor[];
};

type ClinicSettings = {
  clinic_name: string;
  address: string;
  contact_number: string;
  email: string;
};

type ApiResponse = {
  success: boolean;
  message?: string;
  token?: string;
  user?: User;
  data?: any;
};

// ==============================
// CONFIGURATION
// ==============================

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const defaultClinic: ClinicSettings = {
  clinic_name: "MediCare Clinic",
  address: "",
  contact_number: "",
  email: ""
};

const services = [
  {
    icon: Stethoscope,
    title: "General Consultation",
    description: "Professional medical advice and assessment."
  },
  {
    icon: Syringe,
    title: "Vaccination",
    description: "Protect yourself with recommended vaccines."
  },
  {
    icon: HeartPulse,
    title: "Preventive Care",
    description: "Stay healthy through regular health monitoring."
  },
  {
    icon: Activity,
    title: "Health Check-ups",
    description: "Routine examinations and health assessments."
  }
];

// ==============================
// HELPER FUNCTIONS
// ==============================

function getPatientName(user: User | null): string {
  if (!user) return "";

  if (!user.patient) {
    return user.email;
  }

  return `${user.patient.first_name} ${user.patient.last_name}`;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

// ==============================
// MAIN COMPONENT
// ==============================

function App() {
  // AUTHENTICATION
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const savedUser = sessionStorage.getItem("authUser");
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [authToken, setAuthToken] = useState<string | null>(() =>
    sessionStorage.getItem("authToken")
  );

  const [authLoading, setAuthLoading] = useState(true);

  // PATIENT PORTAL DATA
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [bookingServices, setBookingServices] = useState<Service[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [notifications, setNotifications] = useState<PatientNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const [medicalRecordsLoading, setMedicalRecordsLoading] = useState(false);
  const [medicalRecordsError, setMedicalRecordsError] = useState("");
  const [bookingOptionsLoading, setBookingOptionsLoading] = useState(false);
  const [appointmentsLoading, setAppointmentsLoading] = useState(false);
  const [portalError, setPortalError] = useState("");

  // DOCTORS
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [doctorError, setDoctorError] = useState("");

  // CLINIC SETTINGS
  const [clinic, setClinic] =
    useState<ClinicSettings>(defaultClinic);

  const [clinicLoading, setClinicLoading] = useState(true);
  const [clinicError, setClinicError] = useState("");

  // MODALS AND UI
  const [authMode, setAuthMode] =
    useState<"login" | "register" | null>(null);

  const [showBooking, setShowBooking] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  // ==============================
  // CHECK CURRENT USER SESSION
  // ==============================

  useEffect(() => {
    async function verifySession() {
      const token = sessionStorage.getItem("authToken");

      if (!token) {
        setAuthLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data: ApiResponse = await response.json();

        if (!response.ok || !data.success || !data.user) {
          throw new Error("Your session has expired.");
        }

        if (data.user.role !== "patient") {
          throw new Error("This account is not a patient account.");
        }

        setCurrentUser(data.user);
        setAuthToken(token);

        sessionStorage.setItem(
          "authUser",
          JSON.stringify(data.user)
        );
      } catch (error) {
        console.error("Session verification error:", error);

        sessionStorage.removeItem("authToken");
        sessionStorage.removeItem("authUser");

        setCurrentUser(null);
        setAuthToken(null);
      } finally {
        setAuthLoading(false);
      }
    }

    verifySession();
  }, []);

  // ==============================
  // FETCH DOCTORS FROM DATABASE
  // ==============================

  useEffect(() => {
    async function fetchDoctors() {
      try {
        setDoctorsLoading(true);
        setDoctorError("");

        const response = await fetch(`${API_URL}/doctors`);

        const data: DoctorsResponse = await response.json();

        if (!response.ok || !data.success) {
          throw new Error("Unable to retrieve doctors.");
        }

        setDoctors(
          (data.doctors || []).filter(
            doctor =>
              doctor.status?.toLowerCase() === "available"
          )
        );
      } catch (error) {
        console.error("Doctor loading error:", error);

        setDoctorError(getErrorMessage(error));
      } finally {
        setDoctorsLoading(false);
      }
    }

    fetchDoctors();
  }, []);

  // ==============================
  // FETCH PATIENT PORTAL DATA
  // ==============================

  useEffect(() => {
    if (!authToken || !currentUser) {
      setAppointments([]);
      setBookingServices([]);
      setSchedules([]);
      setMedicalRecords([]);
      setMedicalRecordsError("");
      setPortalError("");
      return;
    }

    let cancelled = false;

    async function fetchPatientPortalData() {
      setBookingOptionsLoading(true);
      setAppointmentsLoading(true);
      setPortalError("");

      try {
        const headers = {
          Authorization: `Bearer ${authToken}`
        };

        const [optionsResponse, appointmentsResponse, recordsResponse, notificationsResponse] = await Promise.all([
          fetch(`${API_URL}/patient-portal/booking-options`, { headers }),
          fetch(`${API_URL}/patient-portal/appointments`, { headers }),
          fetch(`${API_URL}/patient-portal/medical-records`, { headers }),
          fetch(`${API_URL}/patient-portal/notifications`, { headers })
        ]);

        const optionsData: PatientPortalOptionsResponse =
          await optionsResponse.json();
        const appointmentsData: PatientAppointmentsResponse =
          await appointmentsResponse.json();
        const recordsData: PatientMedicalRecordsResponse =
          await recordsResponse.json();
        const notificationsData: PatientNotificationsResponse =
          await notificationsResponse.json();

        if (!optionsResponse.ok || !optionsData.success) {
          throw new Error(
            optionsData.message || "Unable to load appointment options."
          );
        }

        if (!appointmentsResponse.ok || !appointmentsData.success) {
          throw new Error(
            appointmentsData.message || "Unable to load your appointments."
          );
        }

        if (!recordsResponse.ok || !recordsData.success) {
          throw new Error(
            recordsData.message || "Unable to load your medical records."
          );
        }

        if (!notificationsResponse.ok || !notificationsData.success) {
          throw new Error(
            notificationsData.message || "Unable to load your notifications."
          );
        }

        if (cancelled) return;

        setDoctors(
          (optionsData.doctors || []).map(doctor => ({
            ...doctor,
            status: "Available"
          }))
        );
        setBookingServices(optionsData.services || []);
        setSchedules(optionsData.schedules || []);
        setMedicalRecords(recordsData.records || []);
        setMedicalRecordsError("");
        setNotifications(notificationsData.notifications || []);
        setNotificationsError("");

        setAppointments(
          (appointmentsData.appointments || []).map(item => ({
            id: String(item.appointment_id),
            patientName: getPatientName(currentUser!),
            patientEmail: currentUser!.email,
            doctor: `Dr. ${item.doctor_first_name} ${item.doctor_last_name}`,
            date: item.appointment_date,
            time: item.appointment_time.slice(0, 5),
            reason: item.reason,
            status: item.status,
            service: item.service_name
          }))
        );
      } catch (error) {
        if (!cancelled) {
          console.error("Patient portal loading error:", error);
          setPortalError(getErrorMessage(error));
        }
      } finally {
        if (!cancelled) {
          setBookingOptionsLoading(false);
          setAppointmentsLoading(false);
        }
      }
    }

    fetchPatientPortalData();

    return () => {
      cancelled = true;
    };
  }, [authToken, currentUser]);

  // ==============================
  // PATIENT NOTIFICATIONS
  // ==============================

  async function handleRefreshNotifications() {
    if (!authToken) return;

    try {
      setNotificationsLoading(true);
      setNotificationsError("");

      const response = await fetch(`${API_URL}/patient-portal/notifications`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data: PatientNotificationsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load your notifications.");
      }

      setNotifications(data.notifications || []);
    } catch (error) {
      console.error("Notifications loading error:", error);
      setNotificationsError(getErrorMessage(error));
    } finally {
      setNotificationsLoading(false);
    }
  }

  async function handleMarkNotificationAsRead(notificationId: number) {
    if (!authToken) return;

    try {
      const response = await fetch(
        `${API_URL}/patient-portal/notifications/${notificationId}/read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update notification.");
      }

      setNotifications(current =>
        current.map(item =>
          item.notification_id === notificationId
            ? { ...item, is_read: 1 }
            : item
        )
      );
    } catch (error) {
      console.error("Mark notification as read error:", error);
      setNotificationsError(getErrorMessage(error));
    }
  }

  async function handleMarkAllNotificationsAsRead() {
    if (!authToken) return;

    try {
      const response = await fetch(
        `${API_URL}/patient-portal/notifications/mark-all-read`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${authToken}` }
        }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update notifications.");
      }

      setNotifications(current =>
        current.map(item => ({ ...item, is_read: 1 }))
      );
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      setNotificationsError(getErrorMessage(error));
    }
  }

  // ==============================
  // REFRESH PATIENT MEDICAL RECORDS
  // ==============================

  async function handleRefreshMedicalRecords() {
    if (!authToken) return;

    try {
      setMedicalRecordsLoading(true);
      setMedicalRecordsError("");

      const response = await fetch(`${API_URL}/patient-portal/medical-records`, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      const data: PatientMedicalRecordsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load medical records.");
      }

      setMedicalRecords(data.records || []);
    } catch (error) {
      console.error("Medical records loading error:", error);
      setMedicalRecordsError(getErrorMessage(error));
    } finally {
      setMedicalRecordsLoading(false);
    }
  }

  // ==============================
  // FETCH CLINIC INFORMATION
  // ==============================

  useEffect(() => {
    async function fetchClinicSettings() {
      try {
        setClinicLoading(true);
        setClinicError("");

        const response = await fetch(
          `${API_URL}/clinic-settings`
        );

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message ||
              "Unable to retrieve clinic information."
          );
        }

        const settings =
          data.data ||
          data.settings ||
          data.clinicSettings ||
          data.clinic ||
          data;

        setClinic({
          clinic_name:
            settings.clinic_name || "MediCare Clinic",
          address: settings.address || "",
          contact_number: settings.contact_number || "",
          email: settings.email || ""
        });
      } catch (error) {
        console.error("Clinic settings loading error:", error);

        setClinicError(getErrorMessage(error));
      } finally {
        setClinicLoading(false);
      }
    }

    fetchClinicSettings();
  }, []);

  // ==============================
  // REGISTER PATIENT
  // ==============================

  async function handleRegister(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const first_name = String(form.get("first_name")).trim();
    const middle_name =
      String(form.get("middle_name")).trim();
    const last_name = String(form.get("last_name")).trim();
    const birth_date = String(form.get("birth_date"));
    const sex = String(form.get("sex"));
    const contact_number =
      String(form.get("contact_number")).trim();
    const address = String(form.get("address")).trim();
    const email = String(form.get("email"))
      .trim()
      .toLowerCase();
    const password = String(form.get("password"));
    const confirmPassword = String(
      form.get("confirm_password")
    );

    if (
      !first_name ||
      !last_name ||
      !email ||
      !password ||
      !sex
    ) {
      setMessage("Please complete all required fields.");
      return;
    }

    if (password.length < 8) {
      setMessage(
        "Password must contain at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    if (
      contact_number &&
      !/^09\d{9}$/.test(contact_number)
    ) {
      setMessage(
        "Please enter a valid 11-digit Philippine mobile number."
      );
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          first_name,
          middle_name: middle_name || null,
          last_name,
          birth_date: birth_date || null,
          sex,
          contact_number,
          address,
          email,
          password
        })
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message || "Unable to register your account."
        );
      }

      setAuthMode("login");
      setMessage(
        data.message ||
          "Registration successful! Please log in to continue."
      );
    } catch (error) {
      console.error("Registration error:", error);
      setMessage(getErrorMessage(error));
    }
  }

  // ==============================
  // LOGIN PATIENT
  // ==============================

  async function handleLogin(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const form = new FormData(event.currentTarget);

    const email = String(form.get("email"))
      .trim()
      .toLowerCase();

    const password = String(form.get("password"));

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        })
      });

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success || !data.token) {
        throw new Error(
          data.message || "Incorrect email or password."
        );
      }

      if (data.user?.role && data.user.role !== "patient") {
        throw new Error(
          "Please use a patient account to access this website."
        );
      }

      // GET COMPLETE PATIENT PROFILE
      const profileResponse = await fetch(
        `${API_URL}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${data.token}`
          }
        }
      );

      const profileData: ApiResponse =
        await profileResponse.json();

      if (
        !profileResponse.ok ||
        !profileData.success ||
        !profileData.user
      ) {
        throw new Error(
          profileData.message ||
            "Unable to retrieve your patient profile."
        );
      }

      if (profileData.user.role !== "patient") {
        throw new Error(
          "This account is not a patient account."
        );
      }

      // SAVE AUTHENTICATION SESSION
      sessionStorage.setItem("authToken", data.token);

      sessionStorage.setItem(
        "authUser",
        JSON.stringify(profileData.user)
      );

      setAuthToken(data.token);
      setCurrentUser(profileData.user);

      setAuthMode(null);

      setMessage(
        `Welcome back, ${getPatientName(profileData.user)}!`
      );
    } catch (error) {
      console.error("Login error:", error);
      setMessage(getErrorMessage(error));
    }
  }

  // ==============================
  // LOGOUT
  // ==============================

  function handleLogout() {
    sessionStorage.removeItem("authToken");
    sessionStorage.removeItem("authUser");

    setAuthToken(null);
    setCurrentUser(null);
    setAppointments([]);
    setBookingServices([]);
    setSchedules([]);
    setNotifications([]);
    setNotificationsError("");

    setShowAppointments(false);
    setShowBooking(false);

    setMessage("You have logged out successfully.");
  }

  // ==============================
  // OPEN BOOKING
  // ==============================

  function openBooking() {
    if (authLoading) {
      setMessage("Please wait while we verify your account.");
      return;
    }

    if (!currentUser) {
      setMessage(
        "Please log in or register before booking an appointment."
      );

      setAuthMode("login");
      return;
    }

    if (!currentUser.patient) {
      setMessage(
        "Your patient profile could not be found. Please contact the clinic."
      );
      return;
    }

    if (doctors.length === 0) {
      setMessage(
        "There are currently no available doctors."
      );
      return;
    }

    setShowBooking(true);
  }

  // ==============================
  // SUBMIT APPOINTMENT TO DATABASE
  // ==============================

  async function handleBooking(
    event: FormEvent<HTMLFormElement>
  ): Promise<boolean> {
    event.preventDefault();

    if (!currentUser || !authToken) {
      setMessage("Please log in using a valid patient account.");
      return false;
    }

    const form = new FormData(event.currentTarget);
    const doctorId = Number(form.get("doctor"));
    const serviceId = Number(form.get("service"));
    const appointmentDate = String(form.get("date") || "");
    const selectedSlot = String(form.get("slot") || "");
    const reason = String(form.get("reason") || "").trim();

    const [scheduleIdText, appointmentTime] = selectedSlot.split("|");
    const scheduleId = Number(scheduleIdText);

    if (
      !doctorId ||
      !serviceId ||
      !scheduleId ||
      !appointmentDate ||
      !appointmentTime ||
      !reason
    ) {
      setMessage("Please complete all appointment details.");
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/patient-portal/appointments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({
          doctor_id: doctorId,
          service_id: serviceId,
          schedule_id: scheduleId,
          appointment_date: appointmentDate,
          appointment_time: appointmentTime,
          reason
        })
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to submit appointment.");
      }

      await refreshMyAppointments();
      setMessage(data.message || "Appointment request submitted successfully.");
      return true;
    } catch (error) {
      console.error("Appointment submission error:", error);
      setMessage(getErrorMessage(error));
      return false;
    }
  }

  async function refreshMyAppointments() {
    if (!authToken || !currentUser) return;

    setAppointmentsLoading(true);

    try {
      const response = await fetch(`${API_URL}/patient-portal/appointments`, {
        headers: {
          Authorization: `Bearer ${authToken}`
        }
      });

      const data: PatientAppointmentsResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to refresh appointments.");
      }

      setAppointments(
        (data.appointments || []).map(item => ({
          id: String(item.appointment_id),
          patientName: getPatientName(currentUser!),
          patientEmail: currentUser!.email,
          doctor: `Dr. ${item.doctor_first_name} ${item.doctor_last_name}`,
          date: item.appointment_date,
          time: item.appointment_time.slice(0, 5),
          reason: item.reason,
          status: item.status,
          service: item.service_name
        }))
      );
    } catch (error) {
      console.error("Refresh appointments error:", error);
      setMessage(getErrorMessage(error));
    } finally {
      setAppointmentsLoading(false);
    }
  }

  async function handleCancelAppointment(appointmentId: string) {
    if (!authToken) return;

    try {
      const response = await fetch(
        `${API_URL}/patient-portal/appointments/${appointmentId}/cancel`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${authToken}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to cancel appointment.");
      }

      setMessage(data.message || "Appointment cancelled successfully.");
      await refreshMyAppointments();
    } catch (error) {
      console.error("Cancel appointment error:", error);
      setMessage(getErrorMessage(error));
    }
  }

  // ==============================
  // PATIENT APPOINTMENTS
  // ==============================

  const myAppointments = appointments;

  const today = new Date().toLocaleDateString("en-CA");

  // ==============================
  // RENDER
  // ==============================

  // Wait until the saved login session has been verified.
  if (authLoading) {
    return (
      <div className="auth-loading">
        <h2>MediCare Clinic</h2>
        <p>Verifying your account...</p>
      </div>
    );
  }

  // Show the separate patient dashboard after successful login.
  if (currentUser && authToken) {
    return (
      <PatientDashboard
        user={currentUser}
        token={authToken}
        doctors={doctors}
        doctorsLoading={doctorsLoading}
        services={bookingServices}
        schedules={schedules}
        bookingOptionsLoading={bookingOptionsLoading}
        appointments={myAppointments}
        appointmentsLoading={appointmentsLoading}
        portalError={portalError}
        medicalRecords={medicalRecords}
        medicalRecordsLoading={medicalRecordsLoading}
        medicalRecordsError={medicalRecordsError}
        onRefreshMedicalRecords={handleRefreshMedicalRecords}
        notifications={notifications}
        notificationsLoading={notificationsLoading}
        notificationsError={notificationsError}
        onRefreshNotifications={handleRefreshNotifications}
        onMarkNotificationAsRead={handleMarkNotificationAsRead}
        onMarkAllNotificationsAsRead={handleMarkAllNotificationsAsRead}
        onLogout={handleLogout}
        onSubmitBooking={handleBooking}
        onCancelAppointment={handleCancelAppointment}
      />
    );
  }

  // Show the public landing page when the patient is logged out.
  return (
    <div className="app">

      {/* NAVIGATION */}
      <header className="navbar">
        <a href="#home" className="brand">
          <span className="brand-icon">
            <HeartPulse size={29} />
          </span>

          <span>
            <strong>MediCare</strong>
            <small>Family Clinic</small>
          </span>
        </a>

        <button
          className="menu-toggle"
          onClick={() => setMobileMenu(!mobileMenu)}
          type="button"
        >
          <Menu />
        </button>

        <nav className={mobileMenu ? "nav-links open" : "nav-links"}>
          <a href="#home" onClick={() => setMobileMenu(false)}>
            Home
          </a>

          <a href="#services" onClick={() => setMobileMenu(false)}>
            Services
          </a>

          <a href="#doctors" onClick={() => setMobileMenu(false)}>
            Our Doctors
          </a>

          <a href="#contact" onClick={() => setMobileMenu(false)}>
            Contact
          </a>
        </nav>

        <div className="nav-actions">
          {currentUser ? (
            <>
              <button
                className="text-button"
                onClick={() => setShowAppointments(true)}
                type="button"
              >
                My Appointments
              </button>

              <button
                className="login-button"
                onClick={handleLogout}
                type="button"
              >
                <LogOut size={16} />
                Logout
              </button>
            </>
          ) : (
            <button
              className="login-button"
              onClick={() => setAuthMode("login")}
              type="button"
              disabled={authLoading}
            >
              <UserRound size={17} />
              Login / Register
            </button>
          )}
        </div>
      </header>

      <main>

        {/* HERO */}
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow">
              <Heart size={16} fill="currentColor" />
              YOUR HEALTH, OUR PRIORITY
            </span>

            <h1>
              Quality Healthcare
              <br />
              <span>for a Healthier You</span>
            </h1>

            <p>
              Your health deserves the best care. Book appointments,
              meet our doctors, and take care of your well-being with us.
            </p>

            <div className="hero-actions">
              <button
                className="primary-button"
                onClick={openBooking}
                type="button"
              >
                <CalendarDays size={19} />
                Book an Appointment
                <ArrowRight size={17} />
              </button>
            </div>

            <div className="hero-note">
              <HeartPulse size={18} />
              <span>
                Trusted care for you and your family
              </span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="image-decoration"></div>

            <div className="clinic-image">
              <img
                src="https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&w=1000&q=85"
                alt="Healthcare professional"
              />
            </div>

            <div className="floating-card">
              <span className="floating-icon">
                <CalendarDays />
              </span>

              <span>
                <strong>Easy Appointment</strong>
                <small>Book your visit online</small>
              </span>
            </div>
          </div>
        </section>

        {/* MEDICAL SERVICES */}
        <section className="section" id="services">
          <div className="section-heading">
            <span>WHAT WE OFFER</span>

            <h2>Our Medical Services</h2>

            <p>
              Healthcare services designed to support your well-being.
            </p>
          </div>

          <div className="service-grid">
            {services.map(service => {
              const Icon = service.icon;

              return (
                <article
                  className="service-card"
                  key={service.title}
                >
                  <div className="service-icon">
                    <Icon size={30} />
                  </div>

                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* DOCTORS */}
        <section
          className="section doctors-section"
          id="doctors"
        >
          <div className="section-heading">
            <span>MEET OUR TEAM</span>

            <h2>Our Doctors</h2>

            <p>
              Meet the healthcare professionals who care for your family.
            </p>
          </div>

          {doctorsLoading ? (
            <div className="empty-state">
              <p>Loading doctors...</p>
            </div>
          ) : doctorError ? (
            <div className="empty-state">
              <p>{doctorError}</p>

              <button
                className="primary-button"
                onClick={() => window.location.reload()}
                type="button"
              >
                Try Again
              </button>
            </div>
          ) : doctors.length === 0 ? (
            <div className="empty-state">
              <Stethoscope size={35} />
              <p>No available doctors at the moment.</p>
            </div>
          ) : (
            <div className="doctor-grid">
              {doctors.map(doctor => (
                <article
                  className="doctor-card"
                  key={doctor.doctor_id}
                >
                  <div className="doctor-avatar">
                    {doctor.first_name.charAt(0).toUpperCase()}
                    {doctor.last_name.charAt(0).toUpperCase()}
                  </div>

                  <h3>
                    Dr. {doctor.first_name} {doctor.last_name}
                  </h3>

                  <span>{doctor.specialization}</span>

                  <p>
                    Available for clinic appointments.
                  </p>

                  <button
                    className="doctor-button"
                    onClick={openBooking}
                    type="button"
                  >
                    Book Appointment
                    <ArrowRight size={15} />
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* CLINIC INFORMATION */}
        <section className="contact-section" id="contact">
          <div>
            <span className="eyebrow">GET IN TOUCH</span>

            <h2>
              {clinicLoading
                ? "Loading clinic information..."
                : clinic.clinic_name}
            </h2>

            <p>
              Contact our clinic for questions and appointment assistance.
            </p>
          </div>

          <div className="contact-details">
            {clinicLoading ? (
              <p>Loading contact details...</p>
            ) : clinicError ? (
              <p>{clinicError}</p>
            ) : (
              <>
                {clinic.address && (
                  <p>
                    <MapPin />
                    {clinic.address}
                  </p>
                )}

                {clinic.contact_number && (
                  <p>
                    <Phone />
                    {clinic.contact_number}
                  </p>
                )}

                {clinic.email && (
                  <p>
                    <Mail />
                    {clinic.email}
                  </p>
                )}

                {!clinic.address &&
                  !clinic.contact_number &&
                  !clinic.email && (
                    <p>
                      Clinic contact information has not been provided yet.
                    </p>
                  )}
              </>
            )}
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="footer">
        <a href="#home" className="brand footer-brand">
          <HeartPulse />

          <span>
            <strong>{clinic.clinic_name}</strong>
            <small>Family Clinic</small>
          </span>
        </a>

        <p>
          © {new Date().getFullYear()} {clinic.clinic_name}.
          All rights reserved.
        </p>
      </footer>

      {/* NOTIFICATION */}
      {message && (
        <div className="toast">
          <CheckCircle2 size={19} />

          <span>{message}</span>

          <button
            onClick={() => setMessage("")}
            type="button"
          >
            <X size={17} />
          </button>
        </div>
      )}

      {/* LOGIN AND REGISTER MODAL */}
      {authMode && (
        <div
          className="modal-overlay"
          onClick={() => setAuthMode(null)}
        >
          <div
            className="modal"
            onClick={event => event.stopPropagation()}
          >
            <button
              className="close-button"
              onClick={() => setAuthMode(null)}
              type="button"
            >
              <X />
            </button>

            <div className="modal-icon">
              <HeartPulse size={30} />
            </div>

            <h2>
              {authMode === "login"
                ? "Welcome Back"
                : "Create Your Account"}
            </h2>

            <p>
              {authMode === "login"
                ? "Log in to manage your appointments."
                : "Register as a patient to get started."}
            </p>

            <form
              onSubmit={
                authMode === "login"
                  ? handleLogin
                  : handleRegister
              }
            >
              {authMode === "register" && (
                <>
                  <label>
                    First Name
                    <input
                      name="first_name"
                      type="text"
                      placeholder="Enter your first name"
                      required
                    />
                  </label>

                  <label>
                    Middle Name
                    <input
                      name="middle_name"
                      type="text"
                      placeholder="Enter your middle name (optional)"
                    />
                  </label>

                  <label>
                    Last Name
                    <input
                      name="last_name"
                      type="text"
                      placeholder="Enter your last name"
                      required
                    />
                  </label>

                  <label>
                    Birth Date
                    <input
                      name="birth_date"
                      type="date"
                      required
                    />
                  </label>

                  <label>
                    Sex
                    <select
                      name="sex"
                      defaultValue=""
                      required
                    >
                      <option value="" disabled>
                        Select sex
                      </option>

                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label>
                    Contact Number
                    <input
                      name="contact_number"
                      type="tel"
                      placeholder="09XXXXXXXXX"
                      maxLength={11}
                      required
                    />
                  </label>

                  <label>
                    Address
                    <textarea
                      name="address"
                      placeholder="Enter your complete address"
                      required
                    />
                  </label>
                </>
              )}

              <label>
                Email Address
                <input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  required
                />
              </label>

              <label>
                Password
                <input
                  name="password"
                  type="password"
                  minLength={8}
                  placeholder="Enter your password"
                  required
                />
              </label>

              {authMode === "register" && (
                <label>
                  Confirm Password
                  <input
                    name="confirm_password"
                    type="password"
                    minLength={8}
                    placeholder="Confirm your password"
                    required
                  />
                </label>
              )}

              <button
                className="primary-button full-button"
                type="submit"
              >
                {authMode === "login"
                  ? "Log In"
                  : "Create Account"}
              </button>
            </form>

            <p className="switch-auth">
              {authMode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}

              <button
                onClick={() => {
                  setMessage("");

                  setAuthMode(
                    authMode === "login"
                      ? "register"
                      : "login"
                  );
                }}
                type="button"
              >
                {authMode === "login"
                  ? " Register"
                  : " Log In"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* APPOINTMENT FORM */}
      {showBooking && currentUser && (
        <div
          className="modal-overlay"
          onClick={() => setShowBooking(false)}
        >
          <div
            className="modal booking-modal"
            onClick={event => event.stopPropagation()}
          >
            <button
              className="close-button"
              onClick={() => setShowBooking(false)}
              type="button"
            >
              <X />
            </button>

            <div className="modal-icon">
              <CalendarDays size={29} />
            </div>

            <h2>Request an Appointment</h2>

            <p>
              Choose your preferred doctor and schedule.
            </p>

            <form onSubmit={handleBooking}>
              <label>
                Patient Name
                <input
                  value={getPatientName(currentUser)}
                  readOnly
                />
              </label>

              <label>
                Select Doctor
                <select
                  name="doctor"
                  required
                  defaultValue=""
                >
                  <option value="" disabled>
                    Select a doctor
                  </option>

                  {doctors.map(doctor => (
                    <option
                      key={doctor.doctor_id}
                      value={doctor.doctor_id}
                    >
                      Dr. {doctor.first_name} {doctor.last_name}
                      {" - "}
                      {doctor.specialization}
                    </option>
                  ))}
                </select>
              </label>

              <div className="form-row">
                <label>
                  Preferred Date
                  <input
                    name="date"
                    type="date"
                    min={today}
                    required
                  />
                </label>

                <label>
                  Preferred Time
                  <select
                    name="time"
                    required
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select time
                    </option>

                    <option value="09:00">09:00 AM</option>
                    <option value="09:30">09:30 AM</option>
                    <option value="10:00">10:00 AM</option>
                    <option value="10:30">10:30 AM</option>
                    <option value="11:00">11:00 AM</option>
                    <option value="11:30">11:30 AM</option>
                    <option value="13:30">01:30 PM</option>
                    <option value="14:00">02:00 PM</option>
                    <option value="14:30">02:30 PM</option>
                    <option value="15:00">03:00 PM</option>
                    <option value="15:30">03:30 PM</option>
                    <option value="16:00">04:00 PM</option>
                    <option value="16:30">04:30 PM</option>
                  </select>
                </label>
              </div>

              <label>
                Reason for Appointment
                <textarea
                  name="reason"
                  placeholder="Briefly describe your reason for visiting"
                  required
                />
              </label>

              <button
                className="primary-button full-button"
                type="submit"
              >
                Submit Appointment Request
              </button>

              <small className="form-note">
                Your request will remain pending until reviewed by the receptionist.
              </small>
            </form>
          </div>
        </div>
      )}

      {/* PATIENT APPOINTMENTS */}
      {showAppointments && currentUser && (
        <div
          className="modal-overlay"
          onClick={() => setShowAppointments(false)}
        >
          <div
            className="modal appointments-modal"
            onClick={event => event.stopPropagation()}
          >
            <button
              className="close-button"
              onClick={() => setShowAppointments(false)}
              type="button"
            >
              <X />
            </button>

            <div className="modal-icon">
              <ClipboardList size={29} />
            </div>

            <h2>My Appointments</h2>

            <p>
              Welcome, {getPatientName(currentUser)}. Here are your appointment requests.
            </p>

            {myAppointments.length === 0 ? (
              <div className="empty-state">
                <CalendarDays size={35} />

                <p>
                  You don't have any appointment requests yet.
                </p>

                <button
                  className="primary-button"
                  onClick={() => {
                    setShowAppointments(false);
                    openBooking();
                  }}
                  type="button"
                >
                  Book an Appointment
                </button>
              </div>
            ) : (
              <div className="appointment-list">
                {myAppointments.map(appointment => (
                  <article
                    className="appointment-card"
                    key={appointment.id}
                  >
                    <div className="appointment-card-top">
                      <strong>{appointment.doctor}</strong>

                      <span className="status-pending">
                        {appointment.status}
                      </span>
                    </div>

                    <p>
                      <CalendarDays size={15} />
                      {appointment.date}
                    </p>

                    <p>
                      <Clock size={15} />
                      {appointment.time}
                    </p>

                    <p>
                      Reason: {appointment.reason}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
