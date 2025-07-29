"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { CanvasHandler, Shape, ShapeType, PencilChunk } from "../../../canvas";
import { useParams, useRouter } from "next/navigation";
import { useSocket } from "../../../hooks/useSocket";

// Server message structure
interface ServerMessage {
    Type: 'initial_state' | 'draw' | 'error' | 'undo' | 'pencil_chunk';
    content?: any;
    sender?: { id: string; name: string };
}

interface User {
    userID: string;
    name: string;
}

export interface UserShape {
    id: string;
    roomId: string;
    type: "rectangle" | "ellipse" | "line" | "pencil";
    creatorId: string;
    color: string;
    strokeWidth: number;
    points: any[];
    x: number;
    y: number;
    endX: number;
    endY: number;
    width: number;
    height: number;
    radius: number;
    createdAt: string;
    updatedAt: string;
}

export default function Canvas() {
    // --- Refs and State ---
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const handlerRef = useRef<CanvasHandler | null>(null);
    const [currentTool, setCurrentTool] = useState<ShapeType>(ShapeType.Rectangle);
    const [userToAdd, setUserToAdd] = useState('');
    const [user, setUser] = useState<User | null>(null);
    
    // --- Routing and Params ---
    const navigate = useRouter();
    const { roomID } = useParams() as { roomID: string };
    const WS_URL = "ws://localhost/ws/";

    // --- WebSocket Message Handling ---
    const handleSocketMessage = useCallback((event: MessageEvent) => {
        try {
            const data: ServerMessage = JSON.parse(event.data);
            console.log("Received message:", data);

            switch (data.Type) {
                case 'initial_state':
                    console.log(`Initial data is:`, data);
                    if (data.content?.shapes && data.content?.user?.userID) {
                        console.log("Shapes received from server:", data.content.shapes);
                        handlerRef.current?.loadShapes(data.content.shapes, data.content.user.userID);
                    }
                    if (data.content?.user) {
                        setUser(data.content.user);
                    }
                    break;
                    
                case 'draw':
                    const shape = data.content as Shape;
                    handlerRef.current?.addRemoteShape(shape);
                    break;
                    
                case 'pencil_chunk':
                    const chunk = data.content as PencilChunk;
                    handlerRef.current?.handlePencilChunk(chunk);
                    break;
                    
                case 'undo':
                    const { shapeID } = data.content;
                    if (shapeID) {
                        handlerRef.current?.removeShapeById(shapeID);
                    }
                    break;
                    
                case 'error':
                    console.error("Server error:", data.content?.error);
                    if (data.content?.error.includes("authorized")) {
                        navigate.push('/join-room');
                    }
                    break;
            }
        } catch (error) {
            console.error("Failed to parse server message:", error);
        }
    }, [navigate]);

    // --- Initialize Socket Connection ---
    const { isConnected, error, sendMessage } = useSocket(WS_URL, handleSocketMessage);

    // --- Lifecycle Effects ---

    useEffect(() => {
        if (error) {
            navigate.push('/join-room');
        }
    }, [error, navigate]);

    useEffect(() => {
        console.log("WebSocket connection status:", isConnected, "and roomId:", roomID);
        if (isConnected && roomID) {
            sendMessage({
                Type: 'join',
                Message: { roomID: roomID }
            });
        }
    }, [isConnected, roomID, sendMessage]);

    useEffect(() => {
        console.log("Initializing CanvasHandler with roomID:", roomID);
        const canvas = canvasRef.current;
        if (!canvas) return;

        const handleShapeAdd = (shape: Shape) => {
            if (isConnected) {
                sendMessage({
                    Type: "draw",
                    Message: shape
                });
            }
        };

        const handlePencilChunk = (chunk: PencilChunk) => {
            if (isConnected) {
                sendMessage({
                    Type: "pencil_chunk",
                    Message: chunk
                });
            }
        };

        handlerRef.current = new CanvasHandler(canvas, handleShapeAdd, handlePencilChunk);
        
        const handleResize = () => handlerRef.current?.resize();
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            handlerRef.current?.destroy();
            handlerRef.current = null;
        };
    }, [sendMessage, isConnected, roomID]); 

    useEffect(() => {
        handlerRef.current?.setTool(currentTool);
    }, [currentTool]);

    // --- UI Handlers and Styles ---
    const handleUndo = () => {
        const undoneShape = handlerRef.current?.undo();
        console.log("Locally undid shape:", undoneShape);

        if (isConnected && undoneShape) {
            sendMessage({
                Type: "undo",
                Message: { 
                    shapeID: undoneShape.id 
                }
            });
            console.log("Sent undo request to server for shape ID:", undoneShape.id);
        }
    };
    
    const handleClear = () => handlerRef.current?.clear();
    
      useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Check for Ctrl+Z for Undo
            if (event.ctrlKey && event.key === 'z') {
                event.preventDefault();
                handleUndo(); // Call the unified undo handler
            }

        };

        // Add the event listener to the document
        document.addEventListener('keydown', handleKeyDown);

        // Cleanup function to remove the listener when the component unmounts
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [handleUndo]);
    

    const addUserToRoom = useCallback(async () => {
        if (!userToAdd.trim()) return;
        try {
            const response = await fetch("/api/room/user", {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ UserName: userToAdd, RoomID: roomID })
            });
            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to add user');
            }
            setUserToAdd('');
        } catch (err: any) {
            console.error('Error adding user:', err);
        }
    }, [userToAdd, roomID]);

    const handleAddUserKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            addUserToRoom();
        }
    };

    const buttonStyle = {
        padding: '8px 16px',
        border: '1px solid #ccc',
        borderRadius: '5px',
        cursor: 'pointer',
        backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        color: "black",
        transition: 'all 0.2s ease-in-out',
    };

    const activeButtonStyle = {
        ...buttonStyle,
        backgroundColor: '#007bff',
        color: 'white',
        borderColor: '#0056b3',
    };

    const connectionStatusStyle = {
        position: 'absolute' as const,
        top: '20px',
        right: '20px',
        padding: '6px 12px',
        borderRadius: '15px',
        backgroundColor: isConnected ? '#28a745' : (error ? '#dc3545' : '#ffc107'),
        color: 'white',
        fontSize: '14px',
        fontWeight: 'bold',
        zIndex: 10,
        boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
    };

    if (!isConnected && !error) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', background: '#f8f9fa' }}>
                <p style={{ fontSize: '1.2rem', color: '#6c757d' }}>Connecting to the canvas...</p>
            </div>
        );
    }

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#f8f9fa' }}>
            <div style={connectionStatusStyle}>
                <span>{isConnected ? '●' : '○'}</span>
                <span>{isConnected ? 'Connected' : (error ? 'Error' : 'Connecting...')}</span>
            </div>

            <canvas 
                ref={canvasRef} 
                style={{ 
                    display: 'block',
                    width: '100%',
                    height: '100%',
                    background: '#ffffff' 
                }} 
            />

            <div style={{
                position: 'absolute' as const,
                top: '10px',
                left: '10px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '10px',
                backgroundColor: 'rgba(240, 240, 240, 0.9)',
                padding: '10px',
                borderRadius: '8px',
                boxShadow: '0 4px 8px rgba(0,0,0,0.15)',
                zIndex: 10,
            }}>
                <button 
                    onClick={() => setCurrentTool(ShapeType.Rectangle)} 
                    style={currentTool === ShapeType.Rectangle ? activeButtonStyle : buttonStyle}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <rect x="4" y="6" width="16" height="12"
                        stroke="currentColor" strokeWidth="2" fill="none" />
                </svg>
                </button>
                <button 
                    onClick={() => setCurrentTool(ShapeType.Ellipse)} 
                    style={currentTool === ShapeType.Ellipse ? activeButtonStyle : buttonStyle}
                >
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                        xmlns="http://www.w3.org/2000/svg">
                        <circle cx="12" cy="12" r="8"
                                stroke="currentColor" strokeWidth="2" fill="none" />
                    </svg>
                </button>
                <button 
                    onClick={() => setCurrentTool(ShapeType.Line)} 
                    style={currentTool === ShapeType.Line ? activeButtonStyle : buttonStyle}
                >
                    <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" strokeWidth="2" />
                </svg>
                </button>
                <button 
                    onClick={() => setCurrentTool(ShapeType.Pencil)} 
                    style={currentTool === ShapeType.Pencil ? activeButtonStyle : buttonStyle}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="size-6">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>

                </button>
                <button onClick={handleUndo} style={buttonStyle}>
                    Undo (Ctrl+Z)
                </button>
                <button onClick={handleClear} style={buttonStyle}>
                    Clear
                </button>
                <div className="add-user" style={{ display: 'flex', gap: '5px' }}>
                    <input
                        type="text"
                        value={userToAdd}
                        onChange={(e) => setUserToAdd(e.target.value)}
                        onKeyDown={handleAddUserKeyPress}
                        placeholder="Enter Username to Add"
                        style={{
                            padding: '6px 10px',
                            borderRadius: '4px',
                            border: '1px solid #ccc',
                            fontSize: '14px'
                        }}
                    />
                    <button onClick={addUserToRoom} style={buttonStyle}>
                        Add User
                    </button>
                </div>
            </div>
        </div>
    );
}