'use client';

import { useParams, useRouter } from 'next/navigation';
import { useState } from 'react';

export default function AddUserToRoom() {
  const params = useParams();
  const router = useRouter();
  const roomId = params.roomId as string;
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/room/user', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          RoomID: roomId,
          UserName: username,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to add user to room');
      }

      setSuccess('User added to room successfully');
      setUsername('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add user to room');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="add-user-container">
      <h2>Add User to Room</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="username">Username:</label>
          <input
            type="text"
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            placeholder="Enter username to add"
          />
        </div>
        
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Adding...' : 'Add User'}
        </button>
      </form>

      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}
    </div>
  );
}