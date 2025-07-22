export interface User {
  id: string;
  email: string;
  userName: string;
  password?: string; // Optional since we might not want to expose this
}

export interface SignupPayload {
  email: string;
  userName: string;
  password: string;
}

export interface SigninPayload {
  email: string;
  password: string;
}

export interface ApiError {
  message: string;
  status?: number;
}

export interface AuthResponse {
  user: User;
  token?: string;
}

export interface Room {
  id: string;
  name: string;
  description?: string;
  isPrivate: boolean;
}

export interface RoomJoinResponse {
  roomID: string;
}