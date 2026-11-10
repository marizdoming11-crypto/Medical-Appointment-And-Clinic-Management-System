import express from "express";

import {
  getDashboardOverview
} from "../controllers/dashboard.controller.js";

import {
  authenticateToken,
  authorizeRoles
} from "../middleware/auth.middleware.js";

const router = express.Router();

router.get(
  "/overview",
  authenticateToken,
  authorizeRoles("admin"),
  getDashboardOverview
);

export default router;