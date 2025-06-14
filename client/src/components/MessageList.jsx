export default function MessageList({ messages }) {
  return (
    <div
      style={{
        height: "300px",
        overflowY: "auto",
        border: "1px solid #ccc",
        padding: "1rem",
        borderRadius: "8px",
        background: "#f9f9f9",
      }}
    >
      {messages.length === 0 ? (
        <p style={{ color: "#777" }}>No messages yet.</p>
      ) : (
        messages.map((msg, index) => (
          <div key={index} style={{ marginBottom: "0.5rem" }}>
            <strong>{msg.username}</strong>: {msg.content}
            <div style={{ fontSize: "0.75rem", color: "#aaa" }}>
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
