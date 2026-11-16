
import { Router } from "express";

import {
  getAllNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from "../controllers/notification.controller.js";

import {
  authenticateToken,
  authorizeRoles
} from "../middleware/auth.middleware.js";

const router = Router();

// All notification routes require an authenticated admin
router.use(authenticateToken, authorizeRoles("admin"));

router.get("/", getAllNotifications);
router.get("/:id", getNotificationById);

router.patch("/mark-all-read", markAllNotificationsAsRead);
router.patch("/:id/read", markNotificationAsRead);

router.delete("/:id", deleteNotification);

export default router;
