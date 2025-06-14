const mongoose = require("mongoose");

const ChannelSchema = new mongoose.Schema({
  channelName: { type: String, required: true, unique: true },
  adminId: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  accessType: { type: String, enum: ['public', 'protected', 'invite'], default: 'public' },
  password: { type: String },
  members: [{ type: String }],
  deleted: { type: Boolean, default: false } // 👈 Soft-delete flag
});

module.exports = mongoose.model("Channel", ChannelSchema);
