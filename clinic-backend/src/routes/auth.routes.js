
import { Router } from "express";

import {
  registerPatient,
  loginUser,
  getCurrentUser
} from "../controllers/auth.controller.js";

import {
  authenticateToken
} from "../middleware/auth.middleware.js";

const router = Router();

// Public routes
router.post("/register", registerPatient);
router.post("/login", loginUser);

// Protected route
router.get("/me", authenticateToken, getCurrentUser);

export default router;
