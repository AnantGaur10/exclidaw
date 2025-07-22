import axios, { AxiosError } from 'axios';
import { SignupPayload, SigninPayload, User, ApiError } from '../types';

const API_BASE_URL = 'http://localhost:8081';

export const signup = async (userData: SignupPayload): Promise<User> => {
  try {
    const response = await axios.post<User>(`${API_BASE_URL}/api/user`, userData, {
      withCredentials: true
    });
    return response.data;
  } catch (err) {
    const axiosError = err as AxiosError<ApiError>;
    throw new Error(axiosError.response?.data?.message || 'Signup failed');
  }
};

export const signin = async (credentials: SigninPayload): Promise<User> => {
  try {
    const response = await axios.post<User>(`${API_BASE_URL}/api/signin`, credentials, {
      withCredentials: true
    });
    return response.data;
  } catch (err) {
    const axiosError = err as AxiosError<ApiError>;
    throw new Error(axiosError.response?.data?.message || 'Signin failed');
  }
};

export const getUserByEmail = async (email: string): Promise<User> => {
  try {
    const response = await axios.get<User>(`${API_BASE_URL}/api/user`, {
      params: { email },
      withCredentials: true
    });
    return response.data;
  } catch (err) {
    const axiosError = err as AxiosError<ApiError>;
    throw new Error(axiosError.response?.data?.message || 'Failed to fetch user');
  }
};