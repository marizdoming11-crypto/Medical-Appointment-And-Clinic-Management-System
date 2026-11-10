
import { Router } from "express";

import {
  getAllDoctors,
  getDoctorById,
  addDoctor,
  updateDoctor,
  deleteDoctor
} from "../controllers/doctor.controller.js";

import {
  authenticateToken,
  authorizeRoles
} from "../middleware/auth.middleware.js";

const router = Router();

// All doctor management endpoints require admin access.
router.use(authenticateToken, authorizeRoles("admin"));

router.get("/", getAllDoctors);
router.get("/:id", getDoctorById);
router.post("/", addDoctor);
router.put("/:id", updateDoctor);
router.delete("/:id", deleteDoctor);

export default router;
