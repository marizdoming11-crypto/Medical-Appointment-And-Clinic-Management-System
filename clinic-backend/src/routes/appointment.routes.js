
import { Router } from "express";

import {
  getAllAppointments,
  getAppointmentById,
  updateAppointmentStatus,
  getAppointmentFormOptions,
  createAppointment
} from "../controllers/appointment.controller.js";

import {
  authenticateToken,
  authorizeRoles
} from "../middleware/auth.middleware.js";

const router = Router();

// Admin access only
router.use(authenticateToken, authorizeRoles("admin"));

// Get patients, doctors, and services for the appointment form
router.get("/form-options", getAppointmentFormOptions);

// Create appointment (existing patient or walk-in)
router.post("/", createAppointment);

// Get all appointments
router.get("/", getAllAppointments);

// Get appointment details
router.get("/:id", getAppointmentById);

// Update appointment status
router.patch("/:id/status", updateAppointmentStatus);

export default router;
