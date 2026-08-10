import express from "express";
import {
  connectClient,
  getStatus,
  logoutClient,
  getQR,
  getConversations,
  getMessages,
  sendMessage,
  toggleAI,
  getKB,
  createKB,
  deleteKB,

} from "../controllers/whatsappController.js";

const router = express.Router();

// Session Control
router.post("/connect", connectClient);
router.get("/status", getStatus);
router.post("/logout", logoutClient);
router.get("/qr", getQR);


// Chats and Messages
router.get("/conversations", getConversations);
router.get("/conversation/:leadId", getMessages);
router.post("/message/send", sendMessage);

// AI Automation
router.post("/ai/toggle", toggleAI);

// Knowledge Base Management
router.route("/knowledge-base").get(getKB).post(createKB);

router.route("/knowledge-base/:id").delete(deleteKB);

// Testing Route
import { testAI, getTestAIHistory } from "../controllers/whatsappController.js";
router.post("/test-ai", testAI);
router.get("/test-ai", getTestAIHistory);

export default router;
