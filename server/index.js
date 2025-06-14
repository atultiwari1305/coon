const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const { Server } = require("socket.io");

const redisClient = require("./config/redis");
const Message = require("./models/Message");
const Channel = require("./models/Channel");
const channelRoutes = require("./routes/channelRoutes");

dotenv.config();

const connectDB = require("./config/db");
const app = express();
const server = http.createServer(app);

// ✅ Middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  methods: ["GET", "POST"],
  credentials: true,
}));
app.use(express.json());

// ✅ API Routes
app.use("/api/channels", channelRoutes);

// ✅ Ensure 'general' channel exists
const ensureGeneralChannelExists = async () => {
  try {
    const generalChannel = await Channel.findOne({ channelName: "general" });
    if (!generalChannel) {
      await Channel.create({
        channelName: "general",
        adminId: "system",
        accessType: "public",
        members: [],
      });
      console.log("✅ General channel created");
    } else {
      console.log("ℹ️ General channel already exists");
    }
  } catch (err) {
    console.error("❌ Error ensuring general channel:", err);
  }
};

// ✅ Connect DB and initialize
connectDB().then(() => {
  ensureGeneralChannelExists();
});

const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("🔌 New socket connected:", socket.id);

  // ✅ Join a room
  socket.on("join_room", async ({ room }) => {
    socket.join(room);
    console.log(`✅ Socket ${socket.id} joined room: ${room}`);

    try {
      const cachedMessages = await redisClient.lRange(`messages:${room}`, 0, -1);
      let messages = [];

      if (cachedMessages.length > 0) {
        messages = cachedMessages.map(msg => JSON.parse(msg));
        console.log(`🧠 Redis: Fetched ${messages.length} messages for #${room}`);
      } else {
        messages = await Message.find({ channel: room })
          .sort({ timestamp: -1 })
          .limit(50)
          .lean();
        messages.reverse();
        console.log(`📦 MongoDB: Fetched ${messages.length} messages for #${room}`);
      }

      socket.emit("message_history", messages);
    } catch (err) {
      console.error("⚠️ Error loading messages:", err);
    }
  });

  // ✅ Handle sending message
  socket.on("send_message", async (data) => {
    const { message, senderID, timestamp, room } = data;

    const newMessage = new Message({
      message,
      senderID,
      timestamp,
      channel: room,
    });

    await newMessage.save();

    const redisKey = `messages:${room}`;
    await redisClient.rPush(redisKey, JSON.stringify({ ...data, _id: newMessage._id }));
    await redisClient.lTrim(redisKey, -100, -1);

    io.to(room).emit("receive_message", { ...data, _id: newMessage._id });
    console.log(`📨 Message from ${senderID} in #${room}: "${message}"`);
  });

  // ✅ Delete a specific message (sender or admin)
  socket.on("delete_message", async ({ messageId, userId }) => {
    try {
      const msg = await Message.findById(messageId);
      if (!msg) return;

      const channel = await Channel.findOne({ channelName: msg.channel });
      if (!channel) return;

      if (msg.senderID === userId || channel.adminId === userId) {
        await msg.deleteOne();
        await redisClient.del(`messages:${msg.channel}`);
        io.to(msg.channel).emit("message_deleted", { messageId });
        console.log(`🗑️ Message ${messageId} deleted from #${msg.channel}`);
      }
    } catch (err) {
      console.error("❌ Error deleting message:", err);
    }
  });

  // ✅ Clear all messages in a channel (admin only)
  socket.on("clear_channel", async ({ channelName, adminId }) => {
    try {
      const channel = await Channel.findOne({ channelName });
      if (!channel || channel.adminId !== adminId) return;

      await Message.deleteMany({ channel: channelName });
      await redisClient.del(`messages:${channelName}`);
      io.to(channelName).emit("channel_cleared");
      console.log(`🧹 Channel #${channelName} messages cleared by admin ${adminId}`);
    } catch (err) {
      console.error("❌ Error clearing channel:", err);
    }
  });

  // ✅ Disconnect
  socket.on("disconnect", () => {
    console.log("❌ Socket disconnected:", socket.id);
  });
});

// ✅ Start server
const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});