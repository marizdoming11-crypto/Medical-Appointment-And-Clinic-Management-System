import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Bell,
  BellRing,
  CheckCheck,
  Check,
  Trash2,
  X,
  AlertCircle,
  CheckCircle2,
  Clock3,
  Inbox,
  LoaderCircle
} from "lucide-react";
import "./NotificationsPage.css";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

interface NotificationItem {
  notification_id: number;
  user_id: number;
  title: string;
  message: string;
  is_read: number | boolean;
  created_at: string;
}

type FilterType = "all" | "unread" | "read";

const getErrorMessage = (data: any, fallback: string) =>
  typeof data?.message === "string" ? data.message : fallback;

const formatDateTime = (value: string) => {
  if (!value) return "Date unavailable";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
};

const isRead = (item: NotificationItem) =>
  item.is_read === true || Number(item.is_read) === 1;

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const token = sessionStorage.getItem("authToken");

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${token}` }),
    [token]
  );

  const fetchNotifications = useCallback(async (showRefresh = false) => {
    try {
      if (showRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");

      const params = new URLSearchParams();
      if (search.trim()) params.set("search", search.trim());
      if (filter !== "all") params.set("status", filter);

      const query = params.toString();
      const response = await fetch(
        `${API_URL}/notifications${query ? `?${query}` : ""}`,
        { headers: authHeaders }
      );
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(getErrorMessage(data, "Unable to load notifications."));
      }

      const rows = data.data ?? data.notifications ?? data.records ?? [];
      setNotifications(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load notifications."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authHeaders, filter, search]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      fetchNotifications();
    }, 250);
    return () => window.clearTimeout(timer);
  }, [fetchNotifications]);

  const totalUnread = notifications.filter((item) => !isRead(item)).length;
  const totalRead = notifications.filter(isRead).length;

  const markAsRead = async (id: number) => {
    try {
      setUpdatingId(id);
      setError("");
      const response = await fetch(`${API_URL}/notifications/${id}/read`, {
        method: "PATCH",
        headers: authHeaders
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(getErrorMessage(data, "Unable to mark notification as read."));
      }

      setSuccessMessage("Notification marked as read.");
      await fetchNotifications(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notification.");
    } finally {
      setUpdatingId(null);
    }
  };

  const markAllAsRead = async () => {
    if (totalUnread === 0) return;

    try {
      setMarkingAll(true);
      setError("");
      const response = await fetch(`${API_URL}/notifications/mark-all-read`, {
        method: "PATCH",
        headers: authHeaders
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(getErrorMessage(data, "Unable to mark all notifications as read."));
      }

      setSuccessMessage("All notifications marked as read.");
      await fetchNotifications(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to update notifications.");
    } finally {
      setMarkingAll(false);
    }
  };

  const deleteNotification = async (id: number) => {
    const confirmed = window.confirm("Are you sure you want to delete this notification?");
    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");
      const response = await fetch(`${API_URL}/notifications/${id}`, {
        method: "DELETE",
        headers: authHeaders
      });
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(getErrorMessage(data, "Unable to delete notification."));
      }

      setSuccessMessage("Notification deleted successfully.");
      await fetchNotifications(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to delete notification.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="notifications-page">
      <header className="notifications-header">
        <div>
          <h1>Notifications</h1>
          <p>View and manage important updates from your clinic system.</p>
        </div>

        <div className="notifications-header-actions">
          <button
            className="notifications-header-btn"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft size={17} />
            Back to Dashboard
          </button>
          <button
            className="notifications-header-btn"
            onClick={() => fetchNotifications(true)}
            disabled={refreshing || loading}
          >
            <RefreshCw size={16} className={refreshing ? "notifications-spin" : ""} />
            Refresh
          </button>
        </div>
      </header>

      {successMessage && (
        <div className="notifications-success">
          <CheckCircle2 size={18} />
          <span>{successMessage}</span>
          <button onClick={() => setSuccessMessage("")} aria-label="Dismiss success">
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="notifications-error">
          <AlertCircle size={18} />
          <span>{error}</span>
          <button onClick={() => setError("")} aria-label="Dismiss error">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="notifications-stats">
        <article className="notifications-stat-card">
          <div className="notifications-stat-icon blue"><Bell size={23} /></div>
          <div><p>Total Notifications</p><h2>{notifications.length}</h2></div>
        </article>
        <article className="notifications-stat-card">
          <div className="notifications-stat-icon orange"><BellRing size={23} /></div>
          <div><p>Unread</p><h2>{totalUnread}</h2></div>
        </article>
        <article className="notifications-stat-card">
          <div className="notifications-stat-icon green"><CheckCheck size={23} /></div>
          <div><p>Read</p><h2>{totalRead}</h2></div>
        </article>
      </section>

      <section className="notifications-panel">
        <div className="notifications-panel-heading">
          <div>
            <h2>Recent Notifications</h2>
            <p>Stay informed about activity in your clinic.</p>
          </div>
          <button
            className="notifications-mark-all"
            onClick={markAllAsRead}
            disabled={markingAll || totalUnread === 0}
          >
            {markingAll ? <LoaderCircle size={16} className="notifications-spin" /> : <CheckCheck size={16} />}
            Mark all as read
          </button>
        </div>

        <div className="notifications-toolbar">
          <div className="notifications-search">
            <Search size={17} />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notifications..."
            />
          </div>

          <div className="notifications-filters" role="group" aria-label="Filter notifications">
            {(["all", "unread", "read"] as FilterType[]).map((item) => (
              <button
                key={item}
                className={filter === item ? "active" : ""}
                onClick={() => setFilter(item)}
              >
                {item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="notifications-list">
          {loading ? (
            <div className="notifications-state">
              <LoaderCircle size={28} className="notifications-spin" />
              <p>Loading notifications...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="notifications-state">
              <Inbox size={38} />
              <h3>No notifications found</h3>
              <p>
                {search || filter !== "all"
                  ? "Try changing your search or filter."
                  : "New clinic updates will appear here."}
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <article
                className={`notifications-item ${isRead(item) ? "read" : "unread"}`}
                key={item.notification_id}
              >
                <div className={`notifications-item-icon ${isRead(item) ? "read" : "unread"}`}>
                  {isRead(item) ? <Bell size={19} /> : <BellRing size={19} />}
                </div>

                <div className="notifications-item-content">
                  <div className="notifications-item-title-row">
                    <h3>{item.title}</h3>
                    {!isRead(item) && <span className="notifications-unread-badge">New</span>}
                  </div>
                  <p>{item.message}</p>
                  <span className="notifications-date">
                    <Clock3 size={13} />
                    {formatDateTime(item.created_at)}
                  </span>
                </div>

                <div className="notifications-item-actions">
                  {!isRead(item) && (
                    <button
                      className="notifications-action read-action"
                      title="Mark as read"
                      aria-label="Mark as read"
                      disabled={updatingId === item.notification_id}
                      onClick={() => markAsRead(item.notification_id)}
                    >
                      {updatingId === item.notification_id
                        ? <LoaderCircle size={16} className="notifications-spin" />
                        : <Check size={17} />}
                    </button>
                  )}
                  <button
                    className="notifications-action delete-action"
                    title="Delete notification"
                    aria-label="Delete notification"
                    disabled={deletingId === item.notification_id}
                    onClick={() => deleteNotification(item.notification_id)}
                  >
                    {deletingId === item.notification_id
                      ? <LoaderCircle size={16} className="notifications-spin" />
                      : <Trash2 size={16} />}
                  </button>
                </div>
              </article>
            ))
          )}
        </div>

        {!loading && notifications.length > 0 && (
          <footer className="notifications-footer">
            Showing {notifications.length} notification{notifications.length === 1 ? "" : "s"}
          </footer>
        )}
      </section>
    </div>
  );
}
