
import { useEffect, useState, type FormEvent } from "react";
import {
  UserRound,
  LockKeyhole,
  Hospital,
  Bell,
  Save,
  Eye,
  EyeOff,
  LoaderCircle,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import "./SettingsPage.css";

const API_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

type SettingsTab = "profile" | "password" | "clinic" | "notifications";

interface AdminProfile {
  user_id?: number;
  email?: string;
  role?: string;
  account_status?: string;
}

interface ClinicSettings {
  setting_id?: number;
  clinic_name: string;
  address: string;
  contact_number: string;
  email: string;
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [profileError, setProfileError] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [clinic, setClinic] = useState<ClinicSettings>({
    clinic_name: "",
    address: "",
    contact_number: "",
    email: "",
  });
  const [loadingClinic, setLoadingClinic] = useState(false);
  const [savingClinic, setSavingClinic] = useState(false);
  const [clinicMessage, setClinicMessage] = useState("");
  const [clinicError, setClinicError] = useState("");

  const token = sessionStorage.getItem("authToken");

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setProfileError("Your login session was not found. Please log in again.");
        setLoadingProfile(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load account information.");
        }

        setProfile(result.user ?? result.data?.user ?? result.data ?? result);
      } catch (error) {
        setProfileError(
          error instanceof Error
            ? error.message
            : "Unable to load account information."
        );
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [token]);

  const handleChangePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordMessage("");
    setPasswordError("");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError("Please complete all password fields.");
      return;
    }

    if (newPassword.length < 8) {
      setPasswordError("Your new password must contain at least 8 characters.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("The new password and confirmation do not match.");
      return;
    }

    if (currentPassword === newPassword) {
      setPasswordError("Your new password must be different from your current password.");
      return;
    }

    if (!token) {
      setPasswordError("Your login session has expired. Please log in again.");
      return;
    }

    setChangingPassword(true);

    try {
      const response = await fetch(`${API_URL}/auth/change-password`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
          confirmPassword,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to change password.");
      }

      setPasswordMessage(result.message || "Password changed successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(
        error instanceof Error ? error.message : "Unable to change password."
      );
    } finally {
      setChangingPassword(false);
    }
  };


  const fetchClinicSettings = async () => {
    if (!token) {
      setClinicError("Your login session has expired. Please log in again.");
      return;
    }

    setLoadingClinic(true);
    setClinicError("");
    try {
      const response = await fetch(`${API_URL}/clinic-settings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to load clinic information.");
      }

      if (result.data) {
        setClinic({
          setting_id: result.data.setting_id,
          clinic_name: result.data.clinic_name || "",
          address: result.data.address || "",
          contact_number: result.data.contact_number || "",
          email: result.data.email || "",
        });
      }
    } catch (error) {
      setClinicError(error instanceof Error ? error.message : "Unable to load clinic information.");
    } finally {
      setLoadingClinic(false);
    }
  };

  useEffect(() => {
    if (activeTab === "clinic") fetchClinicSettings();
  }, [activeTab]);

  const handleSaveClinic = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setClinicMessage("");
    setClinicError("");

    if (!clinic.clinic_name.trim()) {
      setClinicError("Clinic name is required.");
      return;
    }
    if (!token) {
      setClinicError("Your login session has expired. Please log in again.");
      return;
    }

    setSavingClinic(true);
    try {
      const response = await fetch(`${API_URL}/clinic-settings`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clinic_name: clinic.clinic_name,
          address: clinic.address,
          contact_number: clinic.contact_number,
          email: clinic.email,
        }),
      });
      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Unable to save clinic information.");
      }

      setClinicMessage(result.message || "Clinic information saved successfully.");
      await fetchClinicSettings();
    } catch (error) {
      setClinicError(error instanceof Error ? error.message : "Unable to save clinic information.");
    } finally {
      setSavingClinic(false);
    }
  };

  const tabs = [
    { id: "profile" as const, label: "Admin Profile", icon: UserRound },
    { id: "password" as const, label: "Change Password", icon: LockKeyhole },
    { id: "clinic" as const, label: "Clinic Information", icon: Hospital },
    { id: "notifications" as const, label: "Notification Preferences", icon: Bell },
  ];

  return (
    <div className="settings-page">
      <div className="settings-header">
        <div>
          <h1>Settings</h1>
          <p>Manage your MediCare account and system preferences.</p>
        </div>
      </div>

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <h3>GENERAL SETTINGS</h3>

          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                type="button"
                className={`settings-tab ${
                  activeTab === tab.id ? "active" : ""
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={19} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        <main className="settings-content">
          {activeTab === "profile" && (
            <section className="settings-card">
              <div className="settings-card-heading">
                <div className="settings-heading-icon blue">
                  <UserRound size={22} />
                </div>
                <div>
                  <h2>Admin Profile</h2>
                  <p>View your administrator account information.</p>
                </div>
              </div>

              {loadingProfile ? (
                <div className="settings-loading">
                  <LoaderCircle className="settings-spinner" size={22} />
                  Loading account information...
                </div>
              ) : profileError ? (
                <div className="settings-alert error">
                  <AlertCircle size={19} />
                  {profileError}
                </div>
              ) : (
                <div className="profile-information">
                  <div className="profile-avatar">
                    <UserRound size={34} />
                  </div>

                  <div className="profile-details">
                    <h3>Administrator</h3>
                    <span className="profile-role">System Administrator</span>
                  </div>

                  <div className="profile-field">
                    <label>Email Address</label>
                    <div className="profile-value">
                      {profile?.email || "No email available"}
                    </div>
                  </div>

                  <div className="profile-field">
                    <label>Account Role</label>
                    <div className="profile-value">
                      {profile?.role || "Admin"}
                    </div>
                  </div>

                  <div className="profile-field">
                    <label>Account Status</label>
                    <div className="profile-value status-active">
                      <CheckCircle2 size={16} />
                      {profile?.account_status || "Active"}
                    </div>
                  </div>

                  <div className="profile-note">
                    <ShieldCheck size={19} />
                    <span>
                      Your account information is retrieved from your
                      authenticated MediCare account.
                    </span>
                  </div>
                </div>
              )}
            </section>
          )}

          {activeTab === "password" && (
            <section className="settings-card">
              <div className="settings-card-heading">
                <div className="settings-heading-icon purple">
                  <LockKeyhole size={22} />
                </div>
                <div>
                  <h2>Change Password</h2>
                  <p>Update your password to keep your account secure.</p>
                </div>
              </div>

              {passwordMessage && (
                <div className="settings-alert success">
                  <CheckCircle2 size={19} />
                  {passwordMessage}
                </div>
              )}

              {passwordError && (
                <div className="settings-alert error">
                  <AlertCircle size={19} />
                  {passwordError}
                </div>
              )}

              <form onSubmit={handleChangePassword} className="password-form">
                <div className="settings-field">
                  <label htmlFor="currentPassword">Current Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="currentPassword"
                      type={showCurrent ? "text" : "password"}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter your current password"
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="password-visibility"
                      onClick={() => setShowCurrent(!showCurrent)}
                      aria-label="Toggle current password visibility"
                    >
                      {showCurrent ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                <div className="settings-field">
                  <label htmlFor="newPassword">New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="newPassword"
                      type={showNew ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter your new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-visibility"
                      onClick={() => setShowNew(!showNew)}
                      aria-label="Toggle new password visibility"
                    >
                      {showNew ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                  <small>Use at least 8 characters.</small>
                </div>

                <div className="settings-field">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <div className="password-input-wrapper">
                    <input
                      id="confirmPassword"
                      type={showConfirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter your new password"
                      autoComplete="new-password"
                    />
                    <button
                      type="button"
                      className="password-visibility"
                      onClick={() => setShowConfirm(!showConfirm)}
                      aria-label="Toggle password confirmation visibility"
                    >
                      {showConfirm ? <EyeOff size={19} /> : <Eye size={19} />}
                    </button>
                  </div>
                </div>

                <div className="password-security-note">
                  <ShieldCheck size={19} />
                  <span>
                    Your current password is verified before a new password
                    is saved.
                  </span>
                </div>

                <button
                  type="submit"
                  className="settings-primary-button"
                  disabled={changingPassword}
                >
                  {changingPassword ? (
                    <>
                      <LoaderCircle className="settings-spinner" size={18} />
                      Updating Password...
                    </>
                  ) : (
                    <>
                      <LockKeyhole size={18} />
                      Update Password
                    </>
                  )}
                </button>
              </form>
            </section>
          )}

          {activeTab === "clinic" && (
            <section className="settings-card">
              <div className="settings-card-heading">
                <div className="settings-heading-icon green">
                  <Hospital size={22} />
                </div>
                <div>
                  <h2>Clinic Information</h2>
                  <p>Clinic details and contact information.</p>
                </div>
              </div>

              {clinicMessage && (
                <div className="settings-alert success">
                  <CheckCircle2 size={19} />
                  {clinicMessage}
                </div>
              )}

              {clinicError && (
                <div className="settings-alert error">
                  <AlertCircle size={19} />
                  {clinicError}
                </div>
              )}

              {loadingClinic ? (
                <div className="settings-loading">
                  <LoaderCircle className="settings-spinner" size={22} />
                  Loading clinic information...
                </div>
              ) : (
                <form onSubmit={handleSaveClinic} className="clinic-form">
                  <div className="clinic-form-grid">
                    <div className="settings-field clinic-field-full">
                      <label htmlFor="clinicName">Clinic Name *</label>
                      <input
                        id="clinicName"
                        type="text"
                        value={clinic.clinic_name}
                        onChange={(e) => setClinic({ ...clinic, clinic_name: e.target.value })}
                        placeholder="Enter clinic name"
                        maxLength={150}
                        required
                      />
                    </div>

                    <div className="settings-field clinic-field-full">
                      <label htmlFor="clinicAddress">Address</label>
                      <textarea
                        id="clinicAddress"
                        value={clinic.address}
                        onChange={(e) => setClinic({ ...clinic, address: e.target.value })}
                        placeholder="Enter clinic address"
                        rows={3}
                      />
                    </div>

                    <div className="settings-field">
                      <label htmlFor="clinicContact">Contact Number</label>
                      <input
                        id="clinicContact"
                        type="tel"
                        value={clinic.contact_number}
                        onChange={(e) => setClinic({ ...clinic, contact_number: e.target.value })}
                        placeholder="Enter contact number"
                        maxLength={20}
                      />
                    </div>

                    <div className="settings-field">
                      <label htmlFor="clinicEmail">Email Address</label>
                      <input
                        id="clinicEmail"
                        type="email"
                        value={clinic.email}
                        onChange={(e) => setClinic({ ...clinic, email: e.target.value })}
                        placeholder="Enter clinic email"
                        maxLength={150}
                      />
                    </div>
                  </div>

                  <div className="clinic-form-note">
                    <ShieldCheck size={18} />
                    <span>Clinic information is shared across the MediCare system.</span>
                  </div>

                  <button type="submit" className="settings-primary-button" disabled={savingClinic}>
                    {savingClinic ? (
                      <>
                        <LoaderCircle className="settings-spinner" size={18} />
                        Saving Changes...
                      </>
                    ) : (
                      <>
                        <Save size={18} />
                        Save Changes
                      </>
                    )}
                  </button>
                </form>
              )}
            </section>
          )}

          {activeTab === "notifications" && (
            <section className="settings-card">
              <div className="settings-card-heading">
                <div className="settings-heading-icon orange">
                  <Bell size={22} />
                </div>
                <div>
                  <h2>Notification Preferences</h2>
                  <p>Notification delivery preferences for your account.</p>
                </div>
              </div>

              <div className="settings-coming-soon">
                <Bell size={34} />
                <h3>Notification Preferences</h3>
                <p>
                  This section is prepared for configuring which clinic
                  activities generate notifications. We will connect these
                  preferences to the notification backend after the automatic
                  notification workflow is implemented.
                </p>
                <span>Backend integration pending</span>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default SettingsPage;
