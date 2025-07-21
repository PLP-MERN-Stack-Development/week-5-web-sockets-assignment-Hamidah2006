import React, { useEffect, useState } from "react";
import io from "socket.io-client";

const socket = io("http://localhost:5000");

function App() {
  const [username, setUsername] = useState(localStorage.getItem("username") || "");
  const [message, setMessage] = useState("");
  const [privateRecipient, setPrivateRecipient] = useState("");
  const [privateMessage, setPrivateMessage] = useState("");
  const [room, setRoom] = useState("general");
  const [chat, setChat] = useState([]);
  const [typingUser, setTypingUser] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (username) {
      socket.emit("join", username);
      socket.emit("joinRoom", room);
    }

    socket.on("receiveMessage", (data) => {
      setChat((prev) => [...prev, { ...data, reactions: [], readBy: [] }]);
      if ("Notification" in window && data.username !== username) {
        new Notification(`${data.username}`, { body: data.message || "📷 Image" });
      }
    });

    socket.on("typing", (user) => {
      setTypingUser(user);
      setIsTyping(true);
    });

    socket.on("stopTyping", () => setIsTyping(false));

    socket.on("userJoined", (msg) => {
      setChat((prev) => [...prev, { username: "System", message: msg }]);
    });

    socket.on("userLeft", (msg) => {
      setChat((prev) => [...prev, { username: "System", message: msg }]);
    });

    socket.on("onlineUsers", (users) => {
      setOnlineUsers(users);
    });

    socket.on("messageReaction", ({ messageIndex, reaction, username }) => {
      setChat((prev) =>
        prev.map((msg, i) =>
          i === messageIndex
            ? {
                ...msg,
                reactions: [...(msg.reactions || []), { reaction, username }],
              }
            : msg
        )
      );
    });

    socket.on("messageReadAck", ({ messageIndex, by }) => {
      setChat((prev) =>
        prev.map((msg, i) =>
          i === messageIndex ? { ...msg, readBy: [...(msg.readBy || []), by] } : msg
        )
      );
    });

    socket.on("privateMessage", ({ from, message }) => {
      alert(`🔒 Private from ${from}: ${message}`);
    });
  }, [username]);

  useEffect(() => {
    chat.forEach((msg, i) => {
      if (msg.username !== username && !msg.readReported) {
        socket.emit("messageRead", { from: msg.username, messageIndex: i });
        msg.readReported = true;
      }
    });
  }, [chat]);

  const handleSend = () => {
    if (message) {
      socket.emit("sendMessage", { message });
      setMessage("");
      socket.emit("stopTyping");
    }
  };

  const handleTyping = (e) => {
    setMessage(e.target.value);
    socket.emit("typing");
    setTimeout(() => socket.emit("stopTyping"), 800);
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = () => {
        socket.emit("sendMessage", { image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const sendPrivateMessage = () => {
    if (privateRecipient && privateMessage) {
      socket.emit("privateMessage", {
        toUsername: privateRecipient,
        message: privateMessage,
      });
      setPrivateMessage("");
    }
  };

  const joinRoom = () => {
    socket.emit("joinRoom", room);
  };

  const login = () => {
    localStorage.setItem("username", username);
    window.location.reload();
  };

  return (
    <div className="chat-box">
      {!username ? (
        <div>
          <h3>Enter username:</h3>
          <input value={username} onChange={(e) => setUsername(e.target.value)} />
          <button onClick={login}>Join Chat</button>
        </div>
      ) : (
        <>
          <h2>Welcome, {username}!</h2>
          <p>Online: {onlineUsers.join(", ")}</p>

          <div>
            <input placeholder="Room" value={room} onChange={(e) => setRoom(e.target.value)} />
            <button onClick={joinRoom}>Join Room</button>
          </div>

          <div style={{ height: "300px", overflowY: "auto", border: "1px solid #ccc", margin: "1rem 0" }}>
            {chat.map((msg, i) => (
              <div key={i} style={{ marginBottom: "0.5rem" }}>
                <strong>{msg.username}:</strong> {msg.message}
                {msg.image && <div><img src={msg.image} alt="img" style={{ width: "150px" }} /></div>}
                <small> {msg.timestamp}</small>
                <div>
                  {["❤️", "😂", "👍"].map((emoji) => (
                    <button key={emoji} onClick={() => socket.emit("reactToMessage", { messageIndex: i, reaction: emoji })}>{emoji}</button>
                  ))}
                  {msg.reactions && msg.reactions.map((r, j) => <span key={j}> {r.reaction}({r.username}) </span>)}
                  {msg.readBy && msg.readBy.length > 0 && (
                    <div><small>Read by: {msg.readBy.join(", ")}</small></div>
                  )}
                </div>
              </div>
            ))}
            {isTyping && <em>{typingUser} is typing...</em>}
          </div>

          <input value={message} onChange={handleTyping} onKeyDown={(e) => e.key === "Enter" && handleSend()} placeholder="Type message..." />
          <button onClick={handleSend}>Send</button>
          <input type="file" accept="image/*" onChange={handleImageUpload} />

          <div>
            <h4>Private Message</h4>
            <input placeholder="To user" value={privateRecipient} onChange={(e) => setPrivateRecipient(e.target.value)} />
            <input placeholder="Message" value={privateMessage} onChange={(e) => setPrivateMessage(e.target.value)} />
            <button onClick={sendPrivateMessage}>Send 🔐</button>
          </div>
        </>
      )}
    </div>
  );
}

export default App;
                  
