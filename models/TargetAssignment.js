import mongoose from "mongoose";

const tierValuesSchema = new mongoose.Schema(
  {
    callsPerDay:   { type: Number, default: 0 },
    conversionPct: { type: Number, default: 0 },
  },
  { _id: false }
);

const targetAssignmentSchema = new mongoose.Schema(
  {
    repId:   { type: String, required: true },
    repName: { type: String, required: true },
    templateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "TargetTemplate",
      required: true,
    },
    // Manager sets all 3 tier values per employee at assignment time
    tiers: {
      baseline: { type: tierValuesSchema, default: () => ({}) },
      target:   { type: tierValuesSchema, default: () => ({}) },
      star:     { type: tierValuesSchema, default: () => ({}) },
    },
    assignedMonth: {
      type: String,   // "YYYY-MM" — one assignment per rep per month
      required: true,
    },
    assignedBy: { type: String, default: "" },
  },
  { timestamps: true }
);

// One assignment per rep per month
targetAssignmentSchema.index(
  { repId: 1, assignedMonth: 1 },
  { unique: true }
);

targetAssignmentSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    ret.templateId = ret.templateId.toString();
  },
});

const TargetAssignment = mongoose.model(
  "TargetAssignment",
  targetAssignmentSchema
);
export default TargetAssignment;
