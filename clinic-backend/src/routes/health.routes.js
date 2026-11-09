
import { Router } from "express";
import pool from "../config/db.js";

const router = Router();

router.get("/", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    res.status(200).json({
      success: true,
      message: "Clinic API and MySQL are connected."
    });

  } catch (error) {
    console.error("Database connection error:", error.message);

    res.status(503).json({
      success: false,
      message: "Database connection failed."
    });
  }
});

export default router;
