import mongoose from "mongoose";

const leadSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    phone: {
      type: String,
      required: true,
    },
    email: {
      type: String,
    },
    source: {
      type: String,
      enum: [
        "Email",
        "WhatsApp",
        "Meta Ads",
        "Website Form",
        "Call",
        "Manual Entry",
      ],
      default: "Manual Entry",
    },
    service: {
      type: String,
      enum: [
        "walking",
        "training",
        "grooming",
        "sitting",
      ],
      required: true,
      default: "walking",
    },

    assignedTo: {
      type: String,
      default: "Unassigned",
    },
    joinedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: [
        "New",
        "Follow Up",
        "Not Interested",
        "Not Responding",
        "Not Attended",
        "Price Issue",
        "Converted",
        "Active",
        "Closed Won",
        "Policy Active",
      ],
      default: "New",
    },
    leadType: {
      type: String,
      default: "Client",
    },
    providerService: {
      type: String,
      enum: ["Pet Sitter", "Dog Walker", "Groomer", "Trainer", ""],
      default: "",
    },
    nextFollowUp: {
      type: String, // Kept as string to easily map to HTML date input format "YYYY-MM-DD"
    },
    followupTime: {
      type: String,
    },
    notes: {
      type: String,
      default: "No message provided",
    },
    city: {
      type: String,
    },
    preferredContactMethod: {
      type: String,
      enum: ["Email", "SMS", "WhatsApp", "Phone", ""],
      default: "",
    },
    importantLead: {
      type: Boolean,
      default: false,
    },
    appointmentDate: {
      type: String,
    },
    appointmentTime: {
      type: String,
    },
    lastMessage: {
      type: String,
    },
    lastActivity: {
      type: Date,
    },
    aiEnabled: {
      type: Boolean,
      default: true,
    },
    aiQualification: {
      serviceType: { type: String, default: "" },
      city: { type: String, default: "" },
      experience: { type: String, default: "" },
      expectedPayout: { type: String, default: "" },
      availability: { type: String, default: "" },
      interestScore: { type: Number, default: 0 },
    },

    aiTags: {
      type: [String],
      default: [],
    },
    isOldLead: {
      type: Boolean,
      default: false,
    },
    conversationSummary: {
      type: String,
    },
    sentiment: {
      type: String,
    },
    probabilityOfConversion: {
      type: Number,
    },
    nextAction: {
      type: String,
    },
    followUpCount: {
      type: Number,
      default: 0,
    },
    lastFollowUpSentAt: {
      type: Date,
    },
    automatedFollowUpsActive: {
      type: Boolean,
      default: true,
    },
    recordings: [
      {
        name: String,
        url: String,
        analysis: String,
        analysisStatus: { type: String, default: "pending" }, // pending, completed, failed
        uploadedAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

// Cascade delete associated records when a lead is deleted
leadSchema.pre("findOneAndDelete", async function () {
  const doc = await this.model.findOne(this.getQuery());
  if (doc) {
    const id = doc._id;
    await mongoose.model("Followup").deleteMany({ leadId: id });
    await mongoose.model("Conversation").deleteMany({ leadId: id });
    await mongoose.model("Message").deleteMany({ leadId: id });
    await mongoose.model("AILog").deleteMany({ leadId: id });
  }
});

leadSchema.pre("deleteOne", { document: true, query: true }, async function () {
  const id =
    this._id ||
    (this.getQuery && (await this.model.findOne(this.getQuery()))?._id);
  if (id) {
    await mongoose.model("Followup").deleteMany({ leadId: id });
    await mongoose.model("Conversation").deleteMany({ leadId: id });
    await mongoose.model("Message").deleteMany({ leadId: id });
    await mongoose.model("AILog").deleteMany({ leadId: id });
  }
});

// Convert _id to id for frontend compatibility
leadSchema.set("toJSON", {
  virtuals: true,
  versionKey: false,
  transform: function (doc, ret) {
    ret.id = ret._id.toString();
    delete ret._id;
  },
});

const Lead = mongoose.model("Lead", leadSchema);
export default Lead;
