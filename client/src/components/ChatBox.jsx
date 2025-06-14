import React, { useState, useEffect, useRef } from "react";
import socket from "../services/socket";
import { getAnonymousID } from "../services/anonUser";

const ChatBox = ({ selectedChannel }) => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cooldown, setCooldown] = useState(false);
  const messagesEndRef = useRef(null);
  const anonUser = getAnonymousID();

  useEffect(() => {
    if (!selectedChannel?.channelName) return;

    setLoading(true);
    setMessages([]);

    socket.emit("join_room", { room: selectedChannel.channelName });

    const handleLoadMessages = (history) => {
      setMessages(history);
      setLoading(false);
    };

    const handleReceiveMessage = (data) => {
      setMessages((prev) => [...prev, data]);
    };

    const handleMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((msg) => msg._id !== messageId));
    };

    const handleChannelCleared = () => {
      setMessages([]);
    };

    socket.on("message_history", handleLoadMessages);
    socket.on("receive_message", handleReceiveMessage);
    socket.on("message_deleted", handleMessageDeleted);
    socket.on("channel_cleared", handleChannelCleared);

    return () => {
      socket.off("message_history", handleLoadMessages);
      socket.off("receive_message", handleReceiveMessage);
      socket.off("message_deleted", handleMessageDeleted);
      socket.off("channel_cleared", handleChannelCleared);
    };
  }, [selectedChannel?.channelName]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSend = () => {
    if (message.trim() === "" || cooldown) return;

    const messageData = {
      senderID: anonUser,
      message: message.trim(),
      timestamp: new Date().toISOString(),
      room: selectedChannel.channelName,
    };

    socket.emit("send_message", messageData);
    setMessage("");
    setCooldown(true);
    setTimeout(() => setCooldown(false), 1000);
  };

  const handleDeleteMessage = (messageId) => {
    socket.emit("delete_message", {
      messageId,
      userId: anonUser,
    });
  };

  const handleClearChannel = () => {
    if (window.confirm("Are you sure you want to clear all messages?")) {
      socket.emit("clear_channel", {
        channelName: selectedChannel.channelName,
        adminId: anonUser,
      });
    }
  };

  return (
    <div style={{ flex: 1, padding: "20px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2>
          💬 #{selectedChannel.channelName}
          {selectedChannel.isAdmin && (
            <span style={{ color: "blue", fontSize: "0.8em", marginLeft: "8px" }}>
              👑 admin
            </span>
          )}
        </h2>
        {selectedChannel.isAdmin && (
          <button
            onClick={handleClearChannel}
            style={{ padding: "5px 10px", backgroundColor: "#f44336", color: "#fff", border: "none", borderRadius: "4px" }}
          >
            Clear Chat
          </button>
        )}
      </div>

      <div
        style={{
          border: "1px solid #ccc",
          borderRadius: "8px",
          height: "750px",
          overflowY: "auto",
          padding: "10px",
          marginBottom: "10px",
          background: "#f9f9f9",
        }}
      >
        {loading ? (
          <div>Loading chat...</div>
        ) : (
          messages.map((msg, idx) => {
            const isSelf = msg.senderID === anonUser;
            const isMsgFromAdmin = msg.senderID === selectedChannel.adminId;
            const canDelete = isSelf || selectedChannel.isAdmin;

            return (
              <div
                key={msg._id || idx}
                style={{
                  display: "flex",
                  justifyContent: isSelf ? "flex-end" : "flex-start",
                  marginBottom: "10px",
                }}
              >
                <div
                  style={{
                    backgroundColor: isSelf ? "#dcf8c6" : "#fff",
                    padding: "8px 12px",
                    borderRadius: "15px",
                    maxWidth: "75%",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                    position: "relative",
                  }}
                >
                  <strong style={{ fontSize: "0.85em" }}>
                    {msg.senderID}
                    {isMsgFromAdmin && <span style={{ color: "blue" }}> 👑</span>}
                  </strong>
                  <div>{msg.message}</div>
                  <div style={{ fontSize: "0.75em", color: "#777", textAlign: "right" }}>
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>

                  {canDelete && msg._id && (
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      style={{
                        position: "absolute",
                        top: "5px",
                        right: "5px",
                        fontSize: "0.7em",
                        border: "none",
                        background: "transparent",
                        color: "red",
                        cursor: "pointer",
                      }}
                      title="Delete message"
                    >
                      ❌
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ display: "flex" }}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          style={{ flex: 1, padding: "10px", fontSize: "1em" }}
          placeholder="Type a message..."
        />
        <button
          onClick={handleSend}
          style={{ padding: "10px 15px", marginLeft: "5px" }}
          disabled={cooldown}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default ChatBox;