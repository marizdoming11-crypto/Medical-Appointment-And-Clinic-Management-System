
import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { HeartPulse, LockKeyhole, Mail } from "lucide-react";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    setMessage("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Login failed.");
      }

      // Verify administrator access.
      if (data.user?.role !== "admin") {
        throw new Error(
          "Access denied. This portal is for administrators only."
        );
      }

      // Verify that the backend returned a token.
      if (!data.token) {
        throw new Error("Authentication token was not received.");
      }

      // Save authentication information.
      sessionStorage.setItem("authToken", data.token);
      sessionStorage.setItem(
        "authUser",
        JSON.stringify(data.user)
      );

      // Redirect to Admin Dashboard.
      navigate("/dashboard", { replace: true });

    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to connect to the server. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
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
              disabled={isLoading}
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
              disabled={isLoading}
            />
          </div>

          <div className="forgot-password">
            <a href="#forgot-password">
              Forgot password?
            </a>
          </div>

          <button
            type="submit"
            className="auth-button"
            disabled={isLoading}
          >
            {isLoading ? "Signing In..." : "Sign In"}
          </button>

          {message && (
            <p
              className="form-message"
              role="alert"
              aria-live="polite"
            >
              {message}
            </p>
          )}
        </form>

        <div className="auth-footer">
          <p>
            Have an Admin invitation?{" "}
            <Link to="/admin-register">
              Register here
            </Link>
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
