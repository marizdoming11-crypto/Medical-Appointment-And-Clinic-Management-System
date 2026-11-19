
import { Router } from "express";

import {
  getClinicSettings,
  updateClinicSettings
} from "../controllers/clinicSettings.controller.js";

import {
  authenticateToken,
  authorizeRoles
} from "../middleware/auth.middleware.js";

const router = Router();

// Public: allow patients and visitors to view clinic information.
router.get("/", getClinicSettings);

// Admin-only: update clinic information.
router.put(
  "/",
  authenticateToken,
  authorizeRoles("admin"),
  updateClinicSettings
);

export default router;
