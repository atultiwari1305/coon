import React, { useEffect, useState } from "react";
import SidePanel from "./components/SidePanel";
import ChatBox from "./components/ChatBox";
import { getAnonymousID } from "./services/anonUser";
import axios from "axios";

const App = () => {
  const anonUser = getAnonymousID();
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [showChat, setShowChat] = useState(
    sessionStorage.getItem("enteredCoon") === "true"
  );

  useEffect(() => {
    if (!showChat) return;

    const joinGeneral = async () => {
      try {
        const res = await axios.post("/api/channels/join", {
          channelName: "general",
          userId: anonUser,
        });

        setSelectedChannel({
          channelName: "general",
          adminId: res.data.adminId,
          isAdmin: res.data.adminId === anonUser,
        });
      } catch (err) {
        console.error("❌ Error joining general channel:", err.response?.data || err.message);
      }
    };

    joinGeneral();
  }, [anonUser, showChat]);

  const handleSelectChannel = async (channelName) => {
    try {
      const res = await axios.get(`/api/channels/info/${channelName}`);
      const channel = res.data.channel;

      setSelectedChannel({
        channelName: channel.channelName,
        adminId: channel.adminId,
        isAdmin: channel.adminId === anonUser,
      });
    } catch (err) {
      console.error("❌ Error fetching channel info:", err.response?.data || err.message);
    }
  };

  const handleEnterCoon = () => {
    sessionStorage.setItem("enteredCoon", "true");
    setShowChat(true);
  };

  if (!showChat) {
    return (
      <div style={{
        display: "flex",
        height: "100vh",
        justifyContent: "center",
        alignItems: "center",
        flexDirection: "column",
        background: "#f0f0f0"
      }}>
        <h1>Welcome to Coon</h1>
        <button
          onClick={handleEnterCoon}
          style={{
            padding: "10px 20px",
            fontSize: "1.2rem",
            cursor: "pointer",
            backgroundColor: "#007bff",
            color: "#fff",
            border: "none",
            borderRadius: "5px"
          }}
        >
          Enter Coon
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", height: "100vh" }}>
      <SidePanel
        selectedChannel={selectedChannel}
        onSelectChannel={handleSelectChannel}
      />
      {selectedChannel ? (
        <ChatBox selectedChannel={selectedChannel} />
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
};

export default App;