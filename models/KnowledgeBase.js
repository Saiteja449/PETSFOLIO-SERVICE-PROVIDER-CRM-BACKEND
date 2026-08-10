import mongoose from "mongoose";

const knowledgeBaseSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: [
        "faq",
        "company_info",
        "pricing",
        "service",
        "policy",
        "custom_instruction",
      ],
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

knowledgeBaseSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

const KnowledgeBase = mongoose.model("KnowledgeBase", knowledgeBaseSchema);
export default KnowledgeBase;
