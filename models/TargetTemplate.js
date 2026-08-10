import mongoose from "mongoose";

const targetTemplateSchema = new mongoose.Schema(
  {
    categoryName: { type: String, required: true, trim: true },
    type:         { type: String, default: "Core Service", trim: true },
    description:  { type: String, default: "" },
    // The 3 tiers (Baseline / Target / Star) are visual labels only — no numeric values stored here.
    // Numeric target (calls) is set per-employee in TargetAssignment.
  },
  { timestamps: true }
);

targetTemplateSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
  },
});

const TargetTemplate = mongoose.model("TargetTemplate", targetTemplateSchema);
export default TargetTemplate;
