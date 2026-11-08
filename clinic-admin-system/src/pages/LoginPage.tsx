
import { useState } from "react";
import { Link } from "react-router-dom";
import { HeartPulse, LockKeyhole, Mail } from "lucide-react";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();

    // Backend authentication will be connected later.
    setMessage("Login is not connected to the backend yet.");
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

      <div className="auth-card">
        <div className="auth-heading">
          <h2>Welcome Back</h2>
          <p>Sign in to access your staff account.</p>
        </div>

        <form onSubmit={handleLogin}>
          <label>Email Address</label>
          <div className="input-wrapper">
            <Mail size={18} />
            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <label>Password</label>
          <div className="input-wrapper">
            <LockKeyhole size={18} />
            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="forgot-password">
            <a href="#forgot-password">Forgot password?</a>
          </div>

          <button type="submit" className="auth-button">
            Sign In
          </button>

          {message && <p className="form-message">{message}</p>}
        </form>

        <div className="auth-footer">
          <p>
            Have an Admin invitation?{" "}
            <Link to="/admin-register">Register here</Link>
          </p>
        </div>
      </div>

      <p className="security-note">
        Authorized clinic personnel only.
      </p>
    </div>
  );
}

export default LoginPage;
