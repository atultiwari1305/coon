// src/components/MessageInput.jsx
import { useState } from "react";
import socket from "../services/socket";

export default function MessageInput({ username }) {
  const [text, setText] = useState("");

  const handleSend = () => {
    if (text.trim()) {
      const message = {
        username,
        content: text,
        timestamp: new Date().toISOString()
      };
      socket.emit("send_message", message);
      setText(""); // Clear input
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") handleSend();
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem", marginTop: "1rem" }}>
      <input
        type="text"
        placeholder="Type your message..."
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKeyPress}
        style={{ flex: 1, padding: "0.5rem" }}
      />
      <button onClick={handleSend} style={{ padding: "0.5rem 1rem" }}>
        Send
      </button>
    </div>
  );
}
