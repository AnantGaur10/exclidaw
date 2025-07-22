'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function JoinRoomPage() {
  const [roomName, setRoomName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState<ReturnRoomsFormat[]>([])
  const [shouldShow, setShouldShow] = useState<boolean>(false)
  const router = useRouter();


type ReturnRoomsFormat =  {
	RoomName : string 
	RoomID : string
	UserName : string 
}
type RoomIDs = {
  roomID : ReturnRoomsFormat[]
}

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch(`/api/room/name?RoomName=${roomName}`, {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const roomID  : RoomIDs= await response.json();
      console.log(`roomID`);
      console.log(roomID);
      if (roomID.roomID.length == 1){
        router.push(`/room/canvas/${roomID.roomID[0]?.RoomID}`);
      } else if (roomID.roomID.length >1) {
        setShowMenu(roomID.roomID)
        setShouldShow(true)
      } else {
        setError('No rooms found with that name');
        setShouldShow(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to join room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="room-join-container">
      <h2>Join a Room</h2>
      {error && <div className="error-message">{error}</div>}
      <form onSubmit={handleJoinRoom}>
        <div className="form-group">
          <label htmlFor="roomName">Room Name:</label>
          <input
            type="text"
            id="roomName"
            value={roomName}
            onChange={(e) => setRoomName(e.target.value)}
            required
            placeholder="Enter room name"
          />
        </div>
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Joining...' : 'Join Room'}
        </button>
        {shouldShow && (
          <div className="room-menu">
            <h3>Select a Room</h3>
            <ul>
              {showMenu.map((room) => (
                <li key={room.RoomID}>
                  <button
                    onClick={() => {
                      router.push(`/room/canvas/${room.RoomID}`);
                    }}
                  >
                    {room.RoomName} - {room.UserName}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </div>
  );
}