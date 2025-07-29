'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState, useCallback, useRef } from 'react';
import { useSocket } from '../../hooks/useSocket'; // Adjust path if needed
import { getChats } from '../../../components/ChatRoom'; // Adjust path if needed

// Interface for messages received FROM the server
export interface ReceivedMessage {
  Type: string;
  timestamp: string; // This is a number from the Go backend, but JSON stringifies it
  sender: {
    id: string;
    name: string;
  };
  content: {
    // Content can vary, for chat it's a message
    Message?: string;
    // For other types, it could be different
    [key: string]: any;
  };
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomID as string;
  const [messages, setMessages] = useState<ReceivedMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [userToAdd, setUserToAdd] = useState('');
  const [initialChatsLoaded, setInitialChatsLoaded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  const WS_URL = 'ws://localhost/ws/'; // Ensure this URL is correct for your server

  // 1. Define the message handler with useCallback for stability
  const handleIncomingMessage = useCallback((event: MessageEvent) => {
    try {
      const message: ReceivedMessage = JSON.parse(event.data);
      // Only add chat messages to the list
      if (message.Type === 'chat') {
        setMessages(prev => [...prev, message]);
      } else if (message.Type === 'error') {
      }
    } catch (err) {
      console.error('Invalid message format received:', err);
    }
  }, []);

  // 2. Use the hook, passing the stable message handler
  const { isConnected, error, sendMessage } = useSocket(WS_URL, handleIncomingMessage);

  // 3. Effect to fetch initial data
  useEffect(() => {
    if (!roomId) {
      router.push('/join-room');
      return;
    }
    getChats(roomId)
      .then(initialMessages => {
        setMessages(initialMessages);
      })
      .catch(err => {
        console.error('Error fetching initial messages:', err);
      })
      .finally(() => {
        setInitialChatsLoaded(true);
      });
  }, [roomId, router]);

  // 4. Effect to join the room once connected
  useEffect(() => {
    if (isConnected && roomId) {
      sendMessage({
        Type: "join",
        Message: { roomID: roomId }
      });
    }
  }, [isConnected, roomId, sendMessage]);

  // 5. Effect to handle connection errors
  useEffect(() => {
    if (error) {
      router.push('/join-room');
    }
  }, [error, router]);
  
  // Effect to auto-scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // --- UI Handlers ---
  const sendChatMessage = useCallback(() => {
    if (!messageInput.trim() || !isConnected) return;
    sendMessage({
      Type: "chat",
      Message: { Message: messageInput }
    });
    setMessageInput('');
  }, [messageInput, isConnected, sendMessage]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      sendChatMessage();
    }
  };

  const addUserToRoom = useCallback(async () => {
    if (!userToAdd.trim()) return;
    try {
      const response = await fetch("/api/room/user", {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ UserName: userToAdd, RoomID: roomId })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to add user');
      }
      setUserToAdd('');
    } catch (err: any) {
      console.error('Error adding user:', err);
    }
  }, [userToAdd, roomId]);

  const handleAddUserKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      addUserToRoom();
    }
  };

  // --- Render Logic ---
  if (!initialChatsLoaded) {
    return <div>Loading chat history...</div>;
  }

  return (
    <div className="room-container">
      <h2>Room ID: {roomId}</h2>
      <div style={{ color: isConnected ? 'green' : 'red', marginBottom: '10px' }}>
        {isConnected ? '● Connected' : '○ Disconnected'}
      </div>
      
      <div className="messages-container">
        {messages.map((msg, index) => (
          <div key={`${msg.timestamp}-${index}`} className="message">
            <strong>{msg.sender.name}:</strong> {msg.content.Message}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input">
        <input
          type="text"
          value={messageInput}
          onChange={(e) => setMessageInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
          disabled={!isConnected}
        />
        <button 
          onClick={sendChatMessage}
          disabled={!isConnected || !messageInput.trim()}
        >
          Send
        </button>
      </div>

      <div className="add-user">
        <input
          type="text"
          value={userToAdd}
          onChange={(e) => setUserToAdd(e.target.value)}
          onKeyDown={handleAddUserKeyPress}
          placeholder="Enter Username to Add"
        />
        <button onClick={addUserToRoom}>
          Add User
        </button>
      </div>
    </div>
  );
}