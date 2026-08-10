import express from "express";
import {
  getTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  getAssignments,
  upsertAssignment,
  deleteAssignment,
} from "../controllers/targetController.js";

const router = express.Router();

// ── Templates ────────────────────────────────────────────────────────────────
router.route("/templates").get(getTemplates).post(createTemplate);
router.route("/templates/:id").put(updateTemplate).delete(deleteTemplate);

// ── Assignments ───────────────────────────────────────────────────────────────
router.route("/assignments").get(getAssignments).post(upsertAssignment);
router.route("/assignments/:id").delete(deleteAssignment);

export default router;
