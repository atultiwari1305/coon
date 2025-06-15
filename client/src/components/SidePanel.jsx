import React, { useEffect, useState } from "react";
import axios from "axios";
import { getAnonymousID } from "../services/anonUser";
import { API_BASE_URL } from "../services/api"; // ✅ Import API base URL

const SidePanel = ({ selectedChannel, onSelectChannel }) => {
  const [channels, setChannels] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [newChannelName, setNewChannelName] = useState("");
  const [accessType, setAccessType] = useState("public");

  const anonUser = getAnonymousID();

  useEffect(() => {
    if (typeof onSelectChannel !== "function") {
      console.error("❗ onSelectChannel is not a function. Check parent component.");
      return;
    }
    fetchJoinedChannels();
  }, []);

  const fetchJoinedChannels = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/channels/joined/${anonUser}`);
      const list = Array.isArray(res.data.channels) ? res.data.channels : [];

      setChannels(list);

      if (!selectedChannel && list.length > 0) {
        const general = list.find((ch) => ch.channelName === "general") || list[0];
        onSelectChannel(general.channelName);
      }
    } catch (err) {
      console.error("❌ Error fetching joined channels", err);
      setChannels([]);
    }
  };

  const handleSearch = async () => {
    try {
      const res = await axios.get(`${API_BASE_URL}/api/channels/search?name=${searchTerm}`);
      const results = Array.isArray(res.data.channels) ? res.data.channels : [];
      setSearchResults(results);
    } catch (err) {
      console.error("❌ Error searching channels", err);
      setSearchResults([]);
    }
  };

  const handleJoinChannel = async (channel) => {
    try {
      let password = "";

      if (channel.accessType === "protected") {
        password = prompt("🔐 Enter password for this channel:");
        if (!password) return;
      }

      if (channel.accessType === "invite") {
        alert("📩 This is an invite-only channel. You must be invited by the admin.");
        return;
      }

      await axios.post(`${API_BASE_URL}/api/channels/join`, {
        channelName: channel.channelName,
        userId: anonUser,
        password,
      });

      await fetchJoinedChannels();
      setSearchTerm("");
      setSearchResults([]);
      onSelectChannel(channel.channelName);
    } catch (err) {
      const msg = err?.response?.data?.message || "❌ Failed to join channel.";
      alert(msg);
      console.error("❌ Error joining channel", err);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName) return;

    try {
      const body = {
        channelName: newChannelName,
        adminId: anonUser,
        accessType,
      };

      if (accessType === "protected") {
        const password = prompt("🔐 Set a password for the channel:");
        if (!password) return;
        body.password = password;
      }

      await axios.post(`${API_BASE_URL}/api/channels/create`, body);
      await fetchJoinedChannels();
      onSelectChannel(newChannelName);
      setNewChannelName("");
      setAccessType("public");
    } catch (err) {
      const msg = err?.response?.data?.message || "❌ Failed to create channel.";
      alert(msg);
      console.error("❌ Error creating channel", err);
    }
  };

  const handleLeaveChannel = async (channelName) => {
    const confirmLeave = window.confirm(`Are you sure you want to leave #${channelName}?`);
    if (!confirmLeave) return;

    try {
      await axios.post(`${API_BASE_URL}/api/channels/leave`, {
        channelName,
        userId: anonUser,
      });
      await fetchJoinedChannels();
      if (selectedChannel === channelName) {
        onSelectChannel("general");
      }
    } catch (err) {
      console.error("❌ Error leaving channel", err);
    }
  };

  const handleDeleteChannel = async (channelName) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete #${channelName}?`);
    if (!confirmDelete) return;

    try {
      await axios.post(`${API_BASE_URL}/api/channels/delete`, {
        channelName,
        adminId: anonUser,
      });
      await fetchJoinedChannels();
      if (selectedChannel === channelName) {
        onSelectChannel("general");
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "❌ Failed to delete channel.";
      alert(msg);
      console.error("❌ Error deleting channel", err);
    }
  };

  const renderAccessBadge = (type) => {
    switch (type) {
      case "protected":
        return "🔒";
      case "invite":
        return "📩";
      default:
        return "🌐";
    }
  };

  return (
    <div style={{ width: "250px", borderRight: "1px solid #ccc", padding: "10px" }}>
      <h3>📚 My Channels</h3>
      {channels.map((ch, index) => (
        <div
          key={ch._id || `${ch.channelName}-${index}`}
          style={{
            padding: "5px",
            backgroundColor: selectedChannel === ch.channelName ? "#eee" : "transparent",
            borderRadius: "5px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div
            onClick={() => onSelectChannel(ch.channelName)}
            style={{ cursor: "pointer", flexGrow: 1 }}
          >
            #{ch.channelName} {renderAccessBadge(ch.accessType)}{" "}
            {ch.adminId === anonUser && "👑"}
          </div>

          {ch.channelName !== "general" && ch.adminId !== anonUser && (
            <button
              onClick={() => handleLeaveChannel(ch.channelName)}
              style={{
                background: "transparent",
                border: "none",
                color: "red",
                cursor: "pointer",
                fontWeight: "bold",
              }}
            >
              ❌
            </button>
          )}

          {ch.adminId === anonUser && ch.channelName !== "general" && (
            <button
              onClick={() => handleDeleteChannel(ch.channelName)}
              style={{
                marginLeft: "5px",
                color: "red",
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
              title="Delete Channel"
            >
              🗑️
            </button>
          )}
        </div>
      ))}

      <hr />

      <input
        type="text"
        placeholder="Search channels..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        style={{ width: "100%", marginBottom: "5px" }}
      />
      <button onClick={handleSearch}>🔍 Search</button>

      {searchResults.map((res, index) => (
        <div key={res._id || `${res.channelName}-${index}`} style={{ marginTop: "5px" }}>
          #{res.channelName} {renderAccessBadge(res.accessType)}
          <button
            onClick={() => handleJoinChannel(res)}
            style={{ marginLeft: "10px" }}
          >
            Join
          </button>
        </div>
      ))}

      <hr />

      <input
        type="text"
        placeholder="New channel name"
        value={newChannelName}
        onChange={(e) => setNewChannelName(e.target.value)}
        style={{ width: "100%", marginBottom: "5px" }}
      />

      <select
        value={accessType}
        onChange={(e) => setAccessType(e.target.value)}
        style={{ width: "100%", marginBottom: "5px" }}
      >
        <option value="public">🌐 Public</option>
        <option value="protected">🔒 Password Protected</option>
        <option value="invite">📩 Invite Only</option>
      </select>

      <button onClick={handleCreateChannel}>➕ Create Channel</button>
    </div>
  );
};

export default SidePanel;