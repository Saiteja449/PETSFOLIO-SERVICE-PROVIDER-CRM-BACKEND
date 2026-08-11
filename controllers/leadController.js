import Lead from "../models/Lead.js";
import User from "../models/User.js";
import AssignmentState from "../models/AssignmentState.js";

import Followup from "../models/Followup.js";
import Notification from "../models/Notification.js";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import AILog from "../models/AILog.js";
import { getIO } from "../socket/socket.js";
import fs from "fs";
import path from "path";
import { analyzeAudioFile } from "../services/audioAnalysisService.js";

// Helper for background audio analysis
const triggerAudioAnalysis = async (leadId, recordingId, filePath, mimeType) => {
  try {
    console.log(`[AudioAnalysis] Starting background analysis for lead ${leadId}, recording ${recordingId}`);
    const analysis = await analyzeAudioFile(filePath, mimeType);
    await Lead.updateOne(
      { _id: leadId, "recordings._id": recordingId },
      { 
        $set: { 
          "recordings.$.analysis": analysis,
          "recordings.$.analysisStatus": "completed"
        } 
      }
    );
    console.log(`[AudioAnalysis] Successfully updated analysis for recording ${recordingId}`);
  } catch (error) {
    console.error(`[AudioAnalysis] Failed to analyze recording ${recordingId}:`, error);
    await Lead.updateOne(
      { _id: leadId, "recordings._id": recordingId },
      { 
        $set: { 
          "recordings.$.analysisStatus": "failed"
        } 
      }
    );
  }
};

export const getLeads = async (req, res) => {
  try {
    const leads = await Lead.find({});
    res.json({ success: true, data: leads });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getPaginatedLeads = async (req, res) => {
  try {
    const {
      page = 0,
      limit = 10,
      search = "",
      service = "All",
      salesperson = "All",
      status = "All",
      leadTypeTab = "New",
      currentUserRole = "",
      currentUserName = "",
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    let query = {};

    if (currentUserRole === "Sales Representative" && currentUserName) {
      query.assignedTo = {
        $regex: new RegExp("^" + currentUserName + "$", "i"),
      };
    }

    if (search) {
      const searchRegex = new RegExp(search, "i");
      query.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { "aiQualification.serviceType": searchRegex },
        { email: searchRegex },
      ];
    }

    if (service !== "All") query.service = service;
    if (salesperson !== "All") query.assignedTo = salesperson;
    if (status !== "All") query.status = status;

    const todayStr = new Date().toISOString().split("T")[0];

    const applyTabFilter = (q, tab) => {
      if (tab === "OldLeads") {
        q.isOldLead = true;
        q.status = { $regex: new RegExp("^new$", "i") };
      } else {
        if (tab === "New") {
          q.isOldLead = { $ne: true };
          q.status = { $regex: new RegExp("^new$", "i") };
        } else if (tab === "TodayFollowup") {
          q.status = { $regex: new RegExp("^follow up$", "i") };
          q.$or = [
            ...(q.$or || []),
            { nextFollowUp: null },
            { nextFollowUp: "" },
            { nextFollowUp: { $lte: todayStr } },
          ];
        } else if (tab === "UpcomingFollowup") {
          q.status = { $regex: new RegExp("^follow up$", "i") };
          q.nextFollowUp = { $gt: todayStr };
        } else if (tab === "Joined") {
          q.status = { $regex: new RegExp("^joined$", "i") };
        } else if (tab === "Lost") {
          q.status = {
            $in: [
              new RegExp("^price issue$", "i"),
              new RegExp("^not interested$", "i"),
            ],
          };
        } else if (tab === "NotAttended") {
          q.status = { $regex: new RegExp("^not attended$", "i") };
        }
      }
    };

    applyTabFilter(query, leadTypeTab);

    const totalCount = await Lead.countDocuments(query);
    const leads = await Lead.find(query)
      .sort({ createdAt: -1 })
      .skip(pageNum * limitNum)
      .limit(limitNum);

    const baseCountQuery = {};
    if (currentUserRole === "Sales Representative" && currentUserName) {
      baseCountQuery.assignedTo = {
        $regex: new RegExp("^" + currentUserName + "$", "i"),
      };
    }
    if (search) {
      const searchRegex = new RegExp(search, "i");
      baseCountQuery.$or = [
        { name: searchRegex },
        { phone: searchRegex },
        { "aiQualification.serviceType": searchRegex },
        { email: searchRegex },
      ];
    }
    if (service !== "All") baseCountQuery.service = service;
    if (salesperson !== "All") baseCountQuery.assignedTo = salesperson;
    if (status !== "All") baseCountQuery.status = status;

    const facetCounts = await Lead.aggregate([
      { $match: baseCountQuery },
      {
        $facet: {
          OldLeads: [
            { $match: { isOldLead: true, status: { $regex: new RegExp("^new$", "i") } } },
            { $count: "count" }
          ],
          New: [
            { $match: { isOldLead: { $ne: true }, status: { $regex: new RegExp("^new$", "i") } } },
            { $count: "count" },
          ],
          TodayFollowup: [
            {
              $match: {
                status: { $regex: new RegExp("^follow up$", "i") },
                $or: [
                  { nextFollowUp: null },
                  { nextFollowUp: "" },
                  { nextFollowUp: { $lte: todayStr } },
                ],
              },
            },
            { $count: "count" },
          ],
          UpcomingFollowup: [
            {
              $match: {
                status: { $regex: new RegExp("^follow up$", "i") },
                nextFollowUp: { $gt: todayStr },
              },
            },
            { $count: "count" },
          ],
          NotAttended: [
            {
              $match: { status: { $regex: new RegExp("^not attended$", "i") } },
            },
            { $count: "count" },
          ],
          Joined: [
            {
              $match: { status: { $regex: new RegExp("^joined$", "i") } },
            },
            { $count: "count" },
          ],
          Lost: [
            {
              $match: {
                status: {
                  $in: [
                    new RegExp("^price issue$", "i"),
                    new RegExp("^not interested$", "i"),
                  ],
                },
              },
            },
            { $count: "count" },
          ],
        },
      },
    ]);

    const counts = {
      OldLeads: facetCounts[0].OldLeads[0]?.count || 0,
      New: facetCounts[0].New[0]?.count || 0,
      TodayFollowup: facetCounts[0].TodayFollowup[0]?.count || 0,
      UpcomingFollowup: facetCounts[0].UpcomingFollowup[0]?.count || 0,
      NotAttended: facetCounts[0].NotAttended[0]?.count || 0,
      Joined: facetCounts[0].Joined[0]?.count || 0,
      Lost: facetCounts[0].Lost[0]?.count || 0,
    };

    res.json({
      success: true,
      leads,
      totalCount,
      totalPages: Math.ceil(totalCount / limitNum),
      currentPage: pageNum,
      tabCounts: counts,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const createLead = async (req, res) => {
  try {
    const leadData = req.body || {};

    if (leadData.phone) {
      const existingLead = await Lead.findOne({ phone: leadData.phone });
      if (existingLead) {
        return res.status(400).json({
          success: false,
          message: "A lead with this phone number already exists.",
        });
      }
    }

    if (!leadData.assignedTo || leadData.assignedTo === "Unassigned") {
      const reps = await User.find({ role: "sales person" }).sort({ _id: 1 });
      if (reps && reps.length > 0) {
        let state = await AssignmentState.findOne({ key: "leadAssignment" });
        if (!state) {
          state = await AssignmentState.create({
            key: "leadAssignment",
            lastAssignedIndex: -1,
          });
        }

        let nextIndex = state.lastAssignedIndex + 1;
        if (nextIndex >= reps.length) {
          nextIndex = 0;
        }

        leadData.assignedTo = reps[nextIndex].name;
        state.lastAssignedIndex = nextIndex;
        await state.save();
      }
    }
    if (!leadData.joinedAt) {
      leadData.joinedAt = new Date();
    }

    if (req.file) {
      const host = req.get("host");
      const basePath = host.includes("petsfolio.com") ? "/crm-beta/uploads/" : "/uploads/";
      const fileUrl = `${req.protocol}://${host}${basePath}${req.file.filename}`;
      leadData.recordings = [{
        name: req.body.recordingName || req.file.originalname,
        url: fileUrl,
        uploadedAt: new Date(),
      }];
    }

    const lead = await Lead.create(leadData);

    const assignedUser = await User.findOne({ name: lead.assignedTo });
    const targetUsers = assignedUser ? [assignedUser._id] : [];

    await Notification.create({
      title: "New Lead Added",
      message: `Lead ${lead.name} has been added and assigned to ${lead.assignedTo}.`,
      type: "new_lead",
      targetRoles: ["sales manager"],
      targetUsers: targetUsers,
    });

    res.status(201).json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body || {};
    console.log("updateData update Lead");
    console.log(updateData);
    console.log("updated");


    const lead = await Lead.findById(id);

    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    if (req.file) {
      const host = req.get("host");
      const basePath = host.includes("petsfolio.com") ? "/crm-beta/uploads/" : "/uploads/";
      const fileUrl = `${req.protocol}://${host}${basePath}${req.file.filename}`;
      const recordingObj = {
        name: req.body.recordingName || req.file.originalname,
        url: fileUrl,
        analysisStatus: "pending",
        uploadedAt: new Date(),
      };
      if (!lead.recordings) {
        lead.recordings = [];
      }
      lead.recordings.push(recordingObj);
    }

    lead.set(updateData);
    await lead.save();

    if (req.file) {
      const newRecording = lead.recordings[lead.recordings.length - 1];
      if (newRecording) {
        triggerAudioAnalysis(lead._id, newRecording._id, req.file.path, req.file.mimetype);
      }
    }

    if (updateData.status) {
      await Notification.create({
        title: "Lead Status Updated",
        message: `Lead ${lead.name} status updated to ${lead.status}.`,
        type: "lead_update",
        targetRoles: ["sales manager"],
      });
    }

    res.json({ success: true, data: lead });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;

    const lead = await Lead.findByIdAndDelete(id);

    if (!lead) {
      return res
        .status(404)
        .json({ success: false, message: "Lead not found" });
    }

    res.json({
      success: true,
      message: "Lead deleted successfully",
    });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateStatusByWebhook = async (req, res) => {
  try {
    const { phone, email, event } = req.body;

    if (!phone && !email) {
      return res.status(400).json({
        success: false,
        message: "Either phone or email is required.",
      });
    }

    if (!event) {
      return res
        .status(400)
        .json({ success: false, message: "Event is required." });
    }

    let status = "";
    if (event === "joined") {
      status = "Joined";
    } else {
      return res
        .status(400)
        .json({ success: false, message: "Invalid event type." });
    }

    let lead = null;

    if (phone) {
      const cleanPhone = phone.replace(/\D/g, "");
      const last10Digits = cleanPhone.slice(-10);
      lead = await Lead.findOne({
        $or: [{ phone: cleanPhone }, { phone: new RegExp(last10Digits + "$") }],
      });
    }

    if (!lead && email) {
      lead = await Lead.findOne({
        email: new RegExp("^" + email.trim() + "$", "i"),
      });
    }

    if (!lead) {
      return res.status(404).json({
        success: false,
        message: "Lead not found matching the criteria.",
      });
    }

    // Prevent reverting status back to previous stages (e.g. from "Joined" back to "New")
    const funnelOrder = ["New", "Joined"];
    const currentRank = funnelOrder.indexOf(lead.status);
    const targetRank = funnelOrder.indexOf(status);

    if (currentRank !== -1 && targetRank !== -1 && currentRank >= targetRank) {
      return res.status(200).json({
        success: true,
        message: `Lead is already at status "${lead.status}" (requested: "${status}"). No update needed.`,
        data: lead,
      });
    }

    lead.status = status;
    await lead.save();

    await Notification.create({
      title: "Lead Status Webhook Update",
      message: `Lead ${lead.name} status updated to "${status}" via external booking app webhook event: ${event}.`,
      type: "lead_update",
      targetRoles: ["sales manager", "sales person"],
    });

    const io = getIO();
    if (io) {
      io.emit("conversation_updated", {
        leadId: lead._id,
        status,
        lead,
      });
    }

    res.status(200).json({
      success: true,
      message: `Status successfully updated to "${status}" for lead ${lead.name}.`,
      data: lead,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const analyzeRecording = async (req, res) => {
  try {
    const { id, recordingId } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: "Lead not found" });

    const recording = lead.recordings.id(recordingId);
    if (!recording) return res.status(404).json({ success: false, message: "Recording not found" });

    let filename = recording.url.split("/uploads/")[1];
    if (!filename) return res.status(400).json({ success: false, message: "Invalid recording URL" });

    // Decode filename for older files that may contain URL-encoded characters (like %20 for spaces)
    try {
      filename = decodeURIComponent(filename);
    } catch (e) {
      // Ignored
    }

    const filePath = path.join(process.cwd(), "uploads", filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: "Audio file not found on disk" });
    }

    recording.analysisStatus = "pending";
    await lead.save();

    // Trigger in background
    triggerAudioAnalysis(id, recordingId, filePath, "audio/mp4");

    res.json({ success: true, message: "Analysis triggered successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
