
import { Router } from "express";

import {
  registerPatient,
  loginUser,
  getCurrentUser,
  changePassword
} from "../controllers/auth.controller.js";

import {
  authenticateToken
} from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.post("/register", registerPatient);
router.post("/login", loginUser);

// Protected routes
router.get("/me", authenticateToken, getCurrentUser);

router.patch(
  "/change-password",
  authenticateToken,
  changePassword
);

export default router;
