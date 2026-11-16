
import { Router } from "express";

import {
  getAllMedicalRecords,
  getMedicalRecordById,
  getEligibleAppointments,
  createMedicalRecord
} from "../controllers/medicalRecord.controller.js";

import {
  authenticateToken,
  authorizeRoles
} from "../middleware/auth.middleware.js";

const router = Router();

router.use(authenticateToken, authorizeRoles("admin"));

// Completed appointments available for medical record creation
router.get("/eligible-appointments", getEligibleAppointments);

// Create a medical record
router.post("/", createMedicalRecord);

// Get all medical records
router.get("/", getAllMedicalRecords);

// Get one medical record
router.get("/:id", getMedicalRecordById);

export default router;
