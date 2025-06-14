const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  message: { type: String, required: true },
  senderID: { type: String, required: true },
  channel: { type: String, required: true },
  timestamp: { type: Date, default: Date.now }
});

messageSchema.index({ channel: 1, timestamp: -1 });

module.exports = mongoose.model("Message", messageSchema);
