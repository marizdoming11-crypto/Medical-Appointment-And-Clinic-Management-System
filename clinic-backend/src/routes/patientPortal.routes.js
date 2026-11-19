
import { Router } from "express";

import {
  authenticateToken,
  authorizeRoles
} from "../middleware/auth.middleware.js";

import {
  getMyBookingOptions,
  createMyAppointment,
  getMyAppointments,
  cancelMyAppointment,
  getMyMedicalRecords,
  getMyNotifications,
  markMyNotificationAsRead,
  markAllMyNotificationsAsRead
} from "../controllers/patientPortal.controller.js";

const router = Router();

// All patient portal routes require patient authentication.
router.use(authenticateToken, authorizeRoles("patient"));

// BOOKING OPTIONS
router.get("/booking-options", getMyBookingOptions);

// APPOINTMENTS
router.get("/appointments", getMyAppointments);
router.post("/appointments", createMyAppointment);
router.patch("/appointments/:id/cancel", cancelMyAppointment);

// MEDICAL RECORDS
router.get("/medical-records", getMyMedicalRecords);

// NOTIFICATIONS
router.get("/notifications", getMyNotifications);
router.patch("/notifications/mark-all-read", markAllMyNotificationsAsRead);
router.patch("/notifications/:id/read", markMyNotificationAsRead);

export default router;
