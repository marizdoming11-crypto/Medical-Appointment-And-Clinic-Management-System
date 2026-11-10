
import { Router } from "express";

import {
  getAllPatients,
  getPatientById,
  addPatient,
  updatePatient,
  deletePatient
} from "../controllers/patient.controller.js";

import {
  authenticateToken,
  authorizeRoles
} from "../middleware/auth.middleware.js";

const router = Router();

// All patient management routes require an administrator.
router.use(authenticateToken, authorizeRoles("admin"));

router.get("/", getAllPatients);
router.get("/:id", getPatientById);
router.post("/", addPatient);
router.put("/:id", updatePatient);
router.delete("/:id", deletePatient);

export default router;
