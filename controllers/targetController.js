import TargetTemplate from "../models/TargetTemplate.js";
import TargetAssignment from "../models/TargetAssignment.js";

// ─── Templates ────────────────────────────────────────────────────────────────

/**
 * GET /api/targets/templates
 * Returns all target templates, newest first.
 */
export const getTemplates = async (req, res) => {
  try {
    const templates = await TargetTemplate.find().sort({ createdAt: -1 });
    res.json({ success: true, data: templates });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/targets/templates
 * Creates a new target template.
 * Body: { categoryName, type, description, tiers: { baseline, target, star } }
 */
export const createTemplate = async (req, res) => {
  try {
    const { categoryName, type, description, tiers } = req.body;

    if (!categoryName) {
      return res
        .status(400)
        .json({ success: false, message: "categoryName is required." });
    }

    const template = await TargetTemplate.create({
      categoryName,
      type,
      description,
      tiers,
    });

    res.status(201).json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * PUT /api/targets/templates/:id
 * Updates an existing target template.
 */
export const updateTemplate = async (req, res) => {
  try {
    const { categoryName, type, description, tiers } = req.body;

    const template = await TargetTemplate.findByIdAndUpdate(
      req.params.id,
      { categoryName, type, description, tiers },
      { new: true, runValidators: true }
    );

    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found." });
    }

    res.json({ success: true, data: template });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * DELETE /api/targets/templates/:id
 * Deletes a template and all rep assignments that reference it.
 */
export const deleteTemplate = async (req, res) => {
  try {
    const template = await TargetTemplate.findByIdAndDelete(req.params.id);

    if (!template) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found." });
    }

    // Cascade: remove all assignments using this template
    await TargetAssignment.deleteMany({ templateId: req.params.id });

    res.json({
      success: true,
      message: "Template and its assignments deleted.",
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// ─── Assignments ──────────────────────────────────────────────────────────────

/**
 * GET /api/targets/assignments
 * Returns all rep assignments.
 */
export const getAssignments = async (req, res) => {
  try {
    const assignments = await TargetAssignment.find().sort({ createdAt: -1 });
    res.json({ success: true, data: assignments });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/targets/assignments
 * Creates or updates (upserts) an assignment for a rep for a given month.
 * Body: { repId, repName, templateId, tiers, assignedMonth, assignedBy }
 * tiers = { baseline: {callsPerDay, conversionPct}, target: {...}, star: {...} }
 */
export const upsertAssignment = async (req, res) => {
  try {
    const { repId, repName, templateId, tiers, assignedMonth, assignedBy } =
      req.body;

    if (!repId || !templateId || !assignedMonth) {
      return res.status(400).json({
        success: false,
        message: "repId, templateId, and assignedMonth are required.",
      });
    }

    // Verify template exists
    const templateExists = await TargetTemplate.exists({ _id: templateId });
    if (!templateExists) {
      return res
        .status(404)
        .json({ success: false, message: "Template not found." });
    }

    // Normalize tiers — ensure numbers
    const normTiers = {
      baseline: {
        callsPerDay:   Number(tiers?.baseline?.callsPerDay   || 0),
        conversionPct: Number(tiers?.baseline?.conversionPct || 0),
      },
      target: {
        callsPerDay:   Number(tiers?.target?.callsPerDay   || 0),
        conversionPct: Number(tiers?.target?.conversionPct || 0),
      },
      star: {
        callsPerDay:   Number(tiers?.star?.callsPerDay   || 0),
        conversionPct: Number(tiers?.star?.conversionPct || 0),
      },
    };

    const assignment = await TargetAssignment.findOneAndUpdate(
      { repId, assignedMonth },
      { repId, repName, templateId, tiers: normTiers, assignedMonth, assignedBy },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: assignment });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


/**
 * DELETE /api/targets/assignments/:id
 * Removes a specific rep assignment.
 */
export const deleteAssignment = async (req, res) => {
  try {
    const assignment = await TargetAssignment.findByIdAndDelete(req.params.id);

    if (!assignment) {
      return res
        .status(404)
        .json({ success: false, message: "Assignment not found." });
    }

    res.json({ success: true, message: "Assignment removed." });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
