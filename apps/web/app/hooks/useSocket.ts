import { useEffect, useRef, useState, useCallback } from "react";

// The message format that will be sent TO the server.
// Using an uppercase 'T' for 'Type' to match your Go backend struct.
interface OutgoingSocketMessage {
  Type: string;
  Message: object;
}

/**
 * A robust, reusable hook to manage a WebSocket connection for the application.
 * @param url The WebSocket server URL to connect to.
 *  @param onMessage A stable callback function (useCallback) to handle incoming messages.
 */
export function useSocket(
  url: string,
  onMessage?: (event: MessageEvent) => void
) {
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const socketRef = useRef<WebSocket | null>(null);

  // Main connection logic
  const connect = useCallback(() => {
    // Prevent multiple concurrent connections
    if (socketRef.current && socketRef.current.readyState < 2) { // 0=CONNECTING, 1=OPEN
      return;
    }

    const ws = new WebSocket(url);
    socketRef.current = ws;
    
    setIsConnected(false); // Set to false initially on new connection attempt
    setError(null);

    ws.onopen = () => {
      console.log(`Socket connection opened to ${url}`);
      setIsConnected(true);
    };

    ws.onerror = (event) => {
      console.error("Socket error:", event);
      setError("Connection failed. The server might be unavailable.");
      setIsConnected(false);
    };

    ws.onclose = (event) => {
      console.log(`Socket connection closed: ${event.reason}`);
      if (!event.wasClean) {
        setError("Connection lost. Please try rejoining.");
      }
      setIsConnected(false);
      socketRef.current = null;
    };

    // The hook now manages attaching the message handler.
    if (onMessage) {
      ws.onmessage = onMessage;
    }

  }, [url, onMessage]);

  // Effect to manage the connection lifecycle
  useEffect(() => {
    if (url) {
      connect();
    }

    // Cleanup function to close the socket when the component unmounts
    return () => {
      socketRef.current?.close(1000, "User left the page");
    };
  }, [url, connect]); // Reruns if the url or the onMessage handler changes

  // Stable function to send messages
  const sendMessage = useCallback((message: OutgoingSocketMessage) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    } else {
      console.error("Cannot send message: WebSocket is not connected.");
    }
  }, []);

  return {
    isConnected,
    error,
    sendMessage,
  };
}