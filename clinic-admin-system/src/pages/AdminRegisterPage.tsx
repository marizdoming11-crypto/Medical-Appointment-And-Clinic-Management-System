
import { useState } from "react";
import { Link } from "react-router-dom";
import {
  HeartPulse,
  UserRound,
  Mail,
  LockKeyhole,
  KeyRound,
} from "lucide-react";

function AdminRegisterPage() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    invitationCode: "",
  });

  const [message, setMessage] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      setMessage("Passwords do not match.");
      return;
    }

    // Invitation validation and account creation
    // will be handled by the backend later.
    setMessage("Admin registration is not connected to the backend yet.");
  };

  return (
    <div className="auth-page">
      <div className="auth-brand">
        <div className="brand-icon">
          <HeartPulse size={30} />
        </div>
        <h1>MediCare</h1>
        <p>Clinic Administration Portal</p>
      </div>

      <div className="auth-card register-card">
        <div className="auth-heading">
          <h2>Create Admin Account</h2>
          <p>
            Register using an invitation from an existing administrator.
          </p>
        </div>

        <form onSubmit={handleRegister}>
          <label>Full Name</label>
          <div className="input-wrapper">
            <UserRound size={18} />
            <input
              name="name"
              placeholder="Enter your full name"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>

          <label>Email Address</label>
          <div className="input-wrapper">
            <Mail size={18} />
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>

          <label>Password</label>
          <div className="input-wrapper">
            <LockKeyhole size={18} />
            <input
              type="password"
              name="password"
              placeholder="Create a password"
              value={form.password}
              onChange={handleChange}
              minLength={8}
              required
            />
          </div>

          <label>Confirm Password</label>
          <div className="input-wrapper">
            <LockKeyhole size={18} />
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm your password"
              value={form.confirmPassword}
              onChange={handleChange}
              required
            />
          </div>

          <label>Admin Invitation Code</label>
          <div className="input-wrapper">
            <KeyRound size={18} />
            <input
              name="invitationCode"
              placeholder="Enter your invitation code"
              value={form.invitationCode}
              onChange={handleChange}
              required
            />
          </div>

          <button type="submit" className="auth-button">
            Register as Admin
          </button>

          {message && <p className="form-message">{message}</p>}
        </form>

        <div className="auth-footer">
          <p>
            Already have an account? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>

      <p className="security-note">
        Admin registration requires a valid invitation.
      </p>
    </div>
  );
}

export default AdminRegisterPage;
