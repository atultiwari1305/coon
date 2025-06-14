const express = require("express");
const router = express.Router();
const Channel = require("../models/Channel");
const Message = require("../models/Message");

// ✅ 1. Get joined/public channels and ensure user is in 'general'
router.get("/joined/:userId", async (req, res) => {
  const { userId } = req.params;

  try {
    let generalChannel = await Channel.findOne({ channelName: "general" });

    if (!generalChannel) {
      generalChannel = await Channel.create({
        channelName: "general",
        adminId: "system",
        accessType: "public",
        members: [userId],
      });
    } else if (!Array.isArray(generalChannel.members)) {
      generalChannel.members = [userId];
      await generalChannel.save();
    } else if (!generalChannel.members.includes(userId)) {
      generalChannel.members.push(userId);
      await generalChannel.save();
    }

    const joinedChannels = await Channel.find({
      members: userId,
      deleted: { $ne: true }, // ✅ exclude deleted channels
    });

    res.json({ channels: joinedChannels });
  } catch (err) {
    console.error("❌ Error fetching joined channels", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ 2. Join a channel
router.post("/join", async (req, res) => {
  const { channelName, userId } = req.body;

  if (!channelName || !userId) {
    return res.status(400).json({ message: "Missing channelName or userId" });
  }

  let channel = await Channel.findOne({ channelName, deleted: { $ne: true } });

  if (!channel) {
    channel = await Channel.create({
      channelName,
      adminId: userId,
      accessType: "public",
      members: [userId],
    });
  } else {
    if (!channel.members.includes(userId)) {
      channel.members.push(userId);
      await channel.save();
    }
  }

  return res.status(200).json({
    message: "Joined successfully",
    adminId: channel.adminId,
  });
});

// ✅ 3. Create a new channel
router.post("/create", async (req, res) => {
  const { channelName, adminId, accessType } = req.body;

  if (!channelName || !adminId || !accessType) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  try {
    const existing = await Channel.findOne({ channelName });

    if (existing && !existing.deleted) {
      return res.status(409).json({ message: "Channel name already exists" });
    }

    const newChannel = await Channel.create({
      channelName,
      adminId,
      accessType,
      members: [adminId],
      createdAt: new Date(),
      deleted: false,
    });

    res.status(201).json({ message: "Channel created", channel: newChannel });
  } catch (err) {
    console.error("❌ Error creating channel", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ 4. Search channels by name (excluding deleted)
router.get("/search", async (req, res) => {
  const { name } = req.query;

  try {
    const results = await Channel.find({
      channelName: { $regex: name, $options: "i" },
      deleted: { $ne: true }, // ✅ exclude deleted
    });

    res.json({ channels: results });
  } catch (err) {
    console.error("❌ Error searching channels", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ 5. Get info about a single channel
router.get("/info/:channelName", async (req, res) => {
  const { channelName } = req.params;

  try {
    const channel = await Channel.findOne({
      channelName,
      deleted: { $ne: true }, // ✅ exclude deleted
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found or deleted" });
    }

    res.status(200).json({ channel });
  } catch (err) {
    console.error("❌ Error fetching channel info", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ 6. Leave a channel
router.post("/leave", async (req, res) => {
  const { channelName, userId } = req.body;

  if (!channelName || !userId) {
    return res.status(400).json({ message: "Missing channelName or userId" });
  }

  if (channelName === "general") {
    return res.status(403).json({ message: "Cannot leave the general channel" });
  }

  try {
    const channel = await Channel.findOne({
      channelName,
      deleted: { $ne: true },
    });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (!channel.members.includes(userId)) {
      return res.status(400).json({ message: "User is not a member of this channel" });
    }

    channel.members = channel.members.filter(id => id !== userId);

    if (channel.adminId === userId) {
        // Delete messages as well
        await Message.deleteMany({ channelName: channel.channelName });
        await channel.deleteOne();
        return res.status(200).json({ message: "Admin left; channel and messages deleted" });
    }

    await channel.save();
    res.status(200).json({ message: "Left channel successfully" });
  } catch (err) {
    console.error("❌ Error leaving channel", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ 7. Delete channel (admin only)
router.post("/delete", async (req, res) => {
  const { channelName, adminId } = req.body;

  try {
    const channel = await Channel.findOne({ channelName });

    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    if (channel.adminId !== adminId) {
      return res.status(403).json({ message: "Only admin can delete this channel" });
    }

    // Delete the channel
    await Channel.deleteOne({ _id: channel._id });

    // Delete all messages belonging to this channel
    await Message.deleteMany({ channel: channel.channelName });

    res.status(200).json({ message: "Channel and its messages deleted" });
  } catch (err) {
    console.error("❌ Error deleting channel and messages", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Clear all messages in a channel (admin only)
router.post("/clear-messages", async (req, res) => {
  const { channelName, adminId } = req.body;

  try {
    const channel = await Channel.findOne({ channelName });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    if (channel.adminId !== adminId) {
      return res.status(403).json({ message: "Only admin can clear messages" });
    }

    await Message.deleteMany({ channel: channelName });
    res.status(200).json({ message: "All messages cleared" });
  } catch (err) {
    console.error("❌ Error clearing messages:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ Delete a specific message (sender or admin only)
router.delete("/delete-message/:messageId", async (req, res) => {
  const { messageId } = req.params;
  const { userId } = req.body;

  try {
    const msg = await Message.findById(messageId);
    if (!msg) return res.status(404).json({ message: "Message not found" });

    const channel = await Channel.findOne({ channelName: msg.channel });
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    if (msg.senderID !== userId && channel.adminId !== userId) {
      return res.status(403).json({ message: "Not authorized to delete this message" });
    }

    await msg.deleteOne();
    res.status(200).json({ message: "Message deleted" });
  } catch (err) {
    console.error("❌ Error deleting message:", err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;