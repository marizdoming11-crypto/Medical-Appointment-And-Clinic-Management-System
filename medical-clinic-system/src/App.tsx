
import { useEffect, useState, type FormEvent } from "react";
import {
  Activity, CalendarDays, Clock, Heart, HeartPulse,
  Menu, ShieldCheck, Stethoscope, Syringe, Users,
  UserRound, ArrowRight, MapPin, Phone, Mail,
  LogOut, ClipboardList, X, CheckCircle2
} from "lucide-react";
import "./App.css";

type User = {
  id: string;
  name: string;
  email: string;
  password: string;
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
};

const doctors = [
  {
    name: "Dr. Maria Santos",
    specialty: "General Physician",
    description: "General consultations and primary healthcare.",
    initials: "MS",
  },
  {
    name: "Dr. John Reyes",
    specialty: "Pediatrician",
    description: "Healthcare and wellness for children.",
    initials: "JR",
  },
  {
    name: "Dr. Angela Cruz",
    specialty: "Family Medicine",
    description: "Preventive care for the whole family.",
    initials: "AC",
  },
];

const services = [
  {
    icon: Stethoscope,
    title: "General Consultation",
    description: "Professional medical advice and assessment.",
  },
  {
    icon: Syringe,
    title: "Vaccination",
    description: "Protect yourself with recommended vaccines.",
  },
  {
    icon: HeartPulse,
    title: "Preventive Care",
    description: "Stay healthy through regular health monitoring.",
  },
  {
    icon: Activity,
    title: "Health Check-ups",
    description: "Routine examinations and health assessments.",
  },
];

function readStorage<T>(key: string, fallback: T): T {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) as T : fallback;
  } catch {
    return fallback;
  }
}

function App() {
  const [users, setUsers] = useState<User[]>(() =>
    readStorage("clinic_users", [])
  );

  const [appointments, setAppointments] = useState<Appointment[]>(() =>
    readStorage("clinic_appointments", [])
  );

  const [currentUser, setCurrentUser] = useState<User | null>(() =>
    readStorage("clinic_current_user", null)
  );

  const [authMode, setAuthMode] = useState<"login" | "register" | null>(null);
  const [showBooking, setShowBooking] = useState(false);
  const [showAppointments, setShowAppointments] = useState(false);
  const [message, setMessage] = useState("");
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    localStorage.setItem("clinic_users", JSON.stringify(users));
  }, [users]);

  useEffect(() => {
    localStorage.setItem("clinic_appointments", JSON.stringify(appointments));
  }, [appointments]);

  useEffect(() => {
    localStorage.setItem("clinic_current_user", JSON.stringify(currentUser));
  }, [currentUser]);

  function handleRegister(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const name = String(form.get("name")).trim();
    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));

    if (users.some(user => user.email === email)) {
      setMessage("This email is already registered. Please log in.");
      return;
    }

    const newUser: User = {
      id: crypto.randomUUID(),
      name,
      email,
      password,
    };

    setUsers(previous => [...previous, newUser]);
    setCurrentUser(newUser);
    setAuthMode(null);
    setMessage("Your account has been created successfully!");
  }

  function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    const email = String(form.get("email")).trim().toLowerCase();
    const password = String(form.get("password"));

    const foundUser = users.find(
      user => user.email === email && user.password === password
    );

    if (!foundUser) {
      setMessage("Incorrect email or password.");
      return;
    }

    setCurrentUser(foundUser);
    setAuthMode(null);
    setMessage("Welcome back, " + foundUser.name + "!");
  }

  function handleLogout() {
    setCurrentUser(null);
    setShowAppointments(false);
    setMessage("You have logged out.");
  }

  function openBooking() {
    if (!currentUser) {
      setMessage("Please log in or register before booking an appointment.");
      setAuthMode("login");
      return;
    }

    setShowBooking(true);
  }

  function handleBooking(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!currentUser) return;

    const form = new FormData(event.currentTarget);

    const newAppointment: Appointment = {
      id: crypto.randomUUID(),
      patientName: currentUser.name,
      patientEmail: currentUser.email,
      doctor: String(form.get("doctor")),
      date: String(form.get("date")),
      time: String(form.get("time")),
      reason: String(form.get("reason")),
      status: "Pending",
    };

    setAppointments(previous => [...previous, newAppointment]);
    setShowBooking(false);
    setMessage("Appointment request submitted! Please wait for receptionist approval.");
  }

  const myAppointments = appointments.filter(
    appointment => appointment.patientEmail === currentUser?.email
  );

  const today = new Date().toLocaleDateString("en-CA");

  return (
    <div className="app">
      {/* NAVIGATION */}
      <header className="navbar">
        <a href="#home" className="brand">
          <span className="brand-icon"><HeartPulse size={29} /></span>
          <span>
            <strong>MediCare</strong>
            <small>Family Clinic</small>
          </span>
        </a>

        <button className="menu-toggle" onClick={() => setMobileMenu(!mobileMenu)}>
          <Menu />
        </button>

        <nav className={mobileMenu ? "nav-links open" : "nav-links"}>
          <a href="#home" onClick={() => setMobileMenu(false)}>Home</a>
          <a href="#about" onClick={() => setMobileMenu(false)}>About</a>
          <a href="#services" onClick={() => setMobileMenu(false)}>Services</a>
          <a href="#doctors" onClick={() => setMobileMenu(false)}>Our Doctors</a>
          <a href="#contact" onClick={() => setMobileMenu(false)}>Contact</a>
        </nav>

        <div className="nav-actions">
          {currentUser ? (
            <>
              <button className="text-button" onClick={() => setShowAppointments(true)}>
                My Appointments
              </button>
              <button className="login-button" onClick={handleLogout}>
                <LogOut size={16} /> Logout
              </button>
            </>
          ) : (
            <button className="login-button" onClick={() => setAuthMode("login")}>
              <UserRound size={17} /> Login / Register
            </button>
          )}
        </div>
      </header>

      {/* HERO */}
      <main>
        <section className="hero" id="home">
          <div className="hero-content">
            <span className="eyebrow">
              <Heart size={16} fill="currentColor" /> YOUR HEALTH, OUR PRIORITY
            </span>

            <h1>
              Quality Healthcare<br />
              <span>for a Healthier You</span>
            </h1>

            <p>
              Your health deserves the best care. Book appointments,
              meet our doctors, and take care of your well-being with us.
            </p>

            <div className="hero-actions">
              <button className="primary-button" onClick={openBooking}>
                <CalendarDays size={19} /> Book an Appointment <ArrowRight size={17} />
              </button>
              <a href="#about" className="secondary-button">Learn More</a>
            </div>

            <div className="hero-note">
              <ShieldCheck size={18} />
              <span>Trusted care for you and your family</span>
            </div>
          </div>

          <div className="hero-visual">
            <div className="image-decoration"></div>
            <div className="clinic-image">
              <img
                src="https://images.unsplash.com/photo-1622902046580-2b47f47f5471?auto=format&fit=crop&w=1000&q=85"
                alt="Modern healthcare professional"
              />
            </div>
            <div className="floating-card">
              <span className="floating-icon"><CalendarDays /></span>
              <span>
                <strong>Easy Appointment</strong>
                <small>Book your visit online</small>
              </span>
            </div>
          </div>
        </section>

        {/* TRUST FEATURES */}
        <section className="trust-section">
          <div className="trust-item">
            <ShieldCheck />
            <span><strong>Trusted Care</strong><small>Professional Healthcare</small></span>
          </div>
          <div className="trust-item">
            <Clock />
            <span><strong>Easy Booking</strong><small>Online & Walk-in</small></span>
          </div>
          <div className="trust-item">
            <Users />
            <span><strong>Patient Focused</strong><small>Care for Every Family</small></span>
          </div>
          <div className="trust-item">
            <HeartPulse />
            <span><strong>Quality Service</strong><small>Your Health Matters</small></span>
          </div>
        </section>

        {/* SERVICES */}
        <section className="section" id="services">
          <div className="section-heading">
            <span>WHAT WE OFFER</span>
            <h2>Our Medical Services</h2>
            <p>Healthcare services designed to support your well-being.</p>
          </div>

          <div className="service-grid">
            {services.map(service => {
              const Icon = service.icon;
              return (
                <article className="service-card" key={service.title}>
                  <div className="service-icon"><Icon size={30} /></div>
                  <h3>{service.title}</h3>
                  <p>{service.description}</p>
                </article>
              );
            })}
          </div>
        </section>

        {/* ABOUT */}
        <section className="about-section" id="about">
          <div className="about-visual">
            <img
              src="https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&w=1000&q=85"
              alt="Modern clinic interior"
            />
          </div>
          <div className="about-content">
            <span className="eyebrow">ABOUT OUR CLINIC</span>
            <h2>Care that puts you and your family first.</h2>
            <p>
              MediCare Family Clinic is dedicated to providing accessible,
              compassionate, and quality healthcare for individuals and families.
            </p>
            <ul>
              <li><CheckCircle2 /> Patient-centered healthcare</li>
              <li><CheckCircle2 /> Friendly medical professionals</li>
              <li><CheckCircle2 /> Convenient appointment requests</li>
            </ul>
            <a href="#contact" className="secondary-button">Contact Us</a>
          </div>
        </section>

        {/* DOCTORS */}
        <section className="section doctors-section" id="doctors">
          <div className="section-heading">
            <span>MEET OUR TEAM</span>
            <h2>Our Doctors</h2>
            <p>Meet the healthcare professionals who care for your family.</p>
          </div>

          <div className="doctor-grid">
            {doctors.map(doctor => (
              <article className="doctor-card" key={doctor.name}>
                <div className="doctor-avatar">{doctor.initials}</div>
                <h3>{doctor.name}</h3>
                <span>{doctor.specialty}</span>
                <p>{doctor.description}</p>
                <button className="doctor-button" onClick={openBooking}>
                  Book Appointment <ArrowRight size={15} />
                </button>
              </article>
            ))}
          </div>
        </section>

        {/* BOOKING CALL TO ACTION */}
        <section className="booking-banner">
          <div>
            <span>YOUR HEALTH JOURNEY STARTS HERE</span>
            <h2>Ready to book your appointment?</h2>
            <p>Request an appointment and let our receptionist assist you.</p>
          </div>
          <button className="white-button" onClick={openBooking}>
            Book an Appointment <ArrowRight size={17} />
          </button>
        </section>

        {/* CONTACT */}
        <section className="contact-section" id="contact">
          <div>
            <span className="eyebrow">GET IN TOUCH</span>
            <h2>We're here to help.</h2>
            <p>Contact our clinic for questions and appointment assistance.</p>
          </div>
          <div className="contact-details">
            <p><MapPin /> Your Clinic Address, Philippines</p>
            <p><Phone /> Your clinic phone number</p>
            <p><Mail /> clinic@example.com</p>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="footer">
        <a href="#home" className="brand footer-brand">
          <HeartPulse />
          <span><strong>MediCare</strong><small>Family Clinic</small></span>
        </a>
        <p>© 2026 MediCare Family Clinic. All rights reserved.</p>
      </footer>

      {/* NOTIFICATION */}
      {message && (
        <div className="toast">
          <CheckCircle2 size={19} />
          <span>{message}</span>
          <button onClick={() => setMessage("")}><X size={17} /></button>
        </div>
      )}

      {/* LOGIN AND REGISTER MODAL */}
      {authMode && (
        <div className="modal-overlay" onClick={() => setAuthMode(null)}>
          <div className="modal" onClick={event => event.stopPropagation()}>
            <button className="close-button" onClick={() => setAuthMode(null)}><X /></button>
            <div className="modal-icon"><HeartPulse size={30} /></div>
            <h2>{authMode === "login" ? "Welcome Back" : "Create Your Account"}</h2>
            <p>{authMode === "login" ? "Log in to manage your appointments." : "Register as a patient to get started."}</p>

            <form onSubmit={authMode === "login" ? handleLogin : handleRegister}>
              {authMode === "register" && (
                <label>
                  Full Name
                  <input name="name" type="text" placeholder="Enter your full name" required />
                </label>
              )}
              <label>
                Email Address
                <input name="email" type="email" placeholder="Enter your email" required />
              </label>
              <label>
                Password
                <input name="password" type="password" minLength={6} placeholder="Enter your password" required />
              </label>
              <button className="primary-button full-button" type="submit">
                {authMode === "login" ? "Log In" : "Create Account"}
              </button>
            </form>

            <p className="switch-auth">
              {authMode === "login" ? "Don't have an account?" : "Already have an account?"}
              <button onClick={() => { setMessage(""); setAuthMode(authMode === "login" ? "register" : "login"); }}>
                {authMode === "login" ? " Register" : " Log In"}
              </button>
            </p>
          </div>
        </div>
      )}

      {/* APPOINTMENT FORM */}
      {showBooking && currentUser && (
        <div className="modal-overlay" onClick={() => setShowBooking(false)}>
          <div className="modal booking-modal" onClick={event => event.stopPropagation()}>
            <button className="close-button" onClick={() => setShowBooking(false)}><X /></button>
            <div className="modal-icon"><CalendarDays size={29} /></div>
            <h2>Request an Appointment</h2>
            <p>Choose your preferred doctor and schedule.</p>

            <form onSubmit={handleBooking}>
              <label>
                Patient Name
                <input value={currentUser.name} readOnly />
              </label>
              <label>
                Select Doctor
                <select name="doctor" required defaultValue="">
                  <option value="" disabled>Select a doctor</option>
                  {doctors.map(doctor => (
                    <option key={doctor.name} value={doctor.name}>
                      {doctor.name} - {doctor.specialty}
                    </option>
                  ))}
                </select>
              </label>
              <div className="form-row">
                <label>
                  Preferred Date
                  <input name="date" type="date" min={today} required />
                </label>
                <label>
                  Preferred Time
                  <select name="time" required defaultValue="">
                    <option value="" disabled>Select time</option>
                    <option>09:00 AM</option>
                    <option>10:00 AM</option>
                    <option>11:00 AM</option>
                    <option>01:00 PM</option>
                    <option>02:00 PM</option>
                    <option>03:00 PM</option>
                  </select>
                </label>
              </div>
              <label>
                Reason for Appointment
                <textarea name="reason" placeholder="Briefly describe your reason for visiting" required />
              </label>
              <button className="primary-button full-button" type="submit">
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
        <div className="modal-overlay" onClick={() => setShowAppointments(false)}>
          <div className="modal appointments-modal" onClick={event => event.stopPropagation()}>
            <button className="close-button" onClick={() => setShowAppointments(false)}><X /></button>
            <div className="modal-icon"><ClipboardList size={29} /></div>
            <h2>My Appointments</h2>
            <p>Welcome, {currentUser.name}. Here are your appointment requests.</p>

            {myAppointments.length === 0 ? (
              <div className="empty-state">
                <CalendarDays size={35} />
                <p>You don't have any appointment requests yet.</p>
                <button className="primary-button" onClick={() => { setShowAppointments(false); openBooking(); }}>
                  Book an Appointment
                </button>
              </div>
            ) : (
              <div className="appointment-list">
                {myAppointments.map(appointment => (
                  <article className="appointment-card" key={appointment.id}>
                    <div className="appointment-card-top">
                      <strong>{appointment.doctor}</strong>
                      <span className="status-pending">{appointment.status}</span>
                    </div>
                    <p><CalendarDays size={15} /> {appointment.date}</p>
                    <p><Clock size={15} /> {appointment.time}</p>
                    <p>Reason: {appointment.reason}</p>
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
