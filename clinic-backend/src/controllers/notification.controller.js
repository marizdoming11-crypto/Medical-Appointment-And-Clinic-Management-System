
import pool from "../config/db.js";

// Get the authenticated user's ID from the JWT payload
const getUserId = (req) => {
  return req.user?.userId ?? req.user?.user_id;
};

// Validate authenticated user ID
const validateUserId = (req, res) => {
  const userId = getUserId(req);

  if (!userId || !Number.isInteger(Number(userId))) {
    res.status(401).json({
      success: false,
      message: "Invalid user authentication."
    });
    return null;
  }

  return Number(userId);
};

// GET: Retrieve all notifications
export const getAllNotifications = async (req, res) => {
  try {
    const userId = validateUserId(req, res);
    if (!userId) return;

    const { search = "", status = "all" } = req.query;

    console.log("========== NOTIFICATION DEBUG ==========");
    console.log("Authenticated User:", req.user);
    console.log("Notification User ID:", userId);

    let query = `
      SELECT
        notification_id,
        user_id,
        title,
        message,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = ?
    `;

    const params = [userId];

    if (search.trim()) {
      query += ` AND (title LIKE ? OR message LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (status === "unread") {
      query += ` AND is_read = 0`;
    } else if (status === "read") {
      query += ` AND is_read = 1`;
    }

    query += ` ORDER BY created_at DESC`;

    const [notifications] = await pool.query(query, params);

    console.log("Notifications Found:", notifications.length);
    console.log("Notification Data:", notifications);
    console.log("========================================");

    return res.status(200).json({
      success: true,
      total: notifications.length,
      data: notifications
    });

  } catch (error) {
    console.error("Get notifications error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notifications."
    });
  }
};

// GET: Retrieve one notification
export const getNotificationById = async (req, res) => {
  try {
    const userId = validateUserId(req, res);
    if (!userId) return;

    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID."
      });
    }

    const [rows] = await pool.query(
      `SELECT *
       FROM notifications
       WHERE notification_id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found."
      });
    }

    return res.status(200).json({
      success: true,
      data: rows[0]
    });

  } catch (error) {
    console.error("Get notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to retrieve notification."
    });
  }
};

// PATCH: Mark one notification as read
export const markNotificationAsRead = async (req, res) => {
  try {
    const userId = validateUserId(req, res);
    if (!userId) return;

    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID."
      });
    }

    const [result] = await pool.query(
      `UPDATE notifications
       SET is_read = 1
       WHERE notification_id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      const [rows] = await pool.query(
        `SELECT notification_id
         FROM notifications
         WHERE notification_id = ? AND user_id = ?`,
        [notificationId, userId]
      );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Notification not found."
        });
      }
    }

    return res.status(200).json({
      success: true,
      message: "Notification marked as read."
    });

  } catch (error) {
    console.error("Mark notification as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notification."
    });
  }
};

// PATCH: Mark all notifications as read
export const markAllNotificationsAsRead = async (req, res) => {
  try {
    const userId = validateUserId(req, res);
    if (!userId) return;

    const [result] = await pool.query(
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
    console.error("Mark all notifications as read error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update notifications."
    });
  }
};

// DELETE: Delete one notification
export const deleteNotification = async (req, res) => {
  try {
    const userId = validateUserId(req, res);
    if (!userId) return;

    const notificationId = Number(req.params.id);

    if (!Number.isInteger(notificationId) || notificationId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID."
      });
    }

    const [result] = await pool.query(
      `DELETE FROM notifications
       WHERE notification_id = ? AND user_id = ?`,
      [notificationId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: "Notification not found."
      });
    }

    return res.status(200).json({
      success: true,
      message: "Notification deleted successfully."
    });

  } catch (error) {
    console.error("Delete notification error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete notification."
    });
  }
};
