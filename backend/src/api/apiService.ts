// src/api/apiService.ts
import { AppUser, ParentUser } from '../types'; // Ensure AppUser is imported

const BASE_URL = 'http://localhost:3001/api/v1';

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// This interface can be used for any auth response that returns a user and token
interface AuthSuccessResponse {
  data: {
    user: ParentUser; // Or AppUser if more generic user type is returned by Google mock
    token: string;
    message?: string; // Optional message (e.g., from Google mock)
  };
}

interface GetAllUsersSuccessResponse {
  data: {
    users: AppUser[];
    count: number;
  };
}

interface PasswordRecoverySuccessResponse {
  data: {
    message: string;
  };
}

/**
 * Handles API responses, checks for errors, and parses JSON.
 */
async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  if (!response.ok) {
    if (contentType && contentType.includes('application/json')) {
      const errorData: ApiErrorResponse = await response.json();
      console.error('API Error:', errorData);
      throw errorData;
    } else {
      const textError = await response.text();
      console.error('API Error (non-JSON):', textError);
      throw { error: { code: 'NETWORK_ERROR', message: textError || response.statusText } };
    }
  }
  if (contentType && contentType.includes('application/json')) {
    return response.json() as Promise<T>;
  }
  throw { error: { code: 'INVALID_RESPONSE_TYPE', message: 'Expected JSON response from API.'}};
}

export const loginUser = async (email: string, password_param: string): Promise<AuthSuccessResponse> => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: password_param }),
  });
  return handleResponse<AuthSuccessResponse>(response);
};

export const registerParent = async (name: string, email: string, password_param: string): Promise<AuthSuccessResponse> => {
  const response = await fetch(`${BASE_URL}/auth/register/parent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password: password_param }),
  });
  return handleResponse<AuthSuccessResponse>(response);
};

export const getAllUsers = async (authToken: string | null): Promise<GetAllUsersSuccessResponse> => {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  // if (authToken) { // Backend /auth/users is not currently protected
  //   headers['Authorization'] = `Bearer ${authToken}`;
  // }

  const response = await fetch(`${BASE_URL}/auth/users`, {
    method: 'GET',
    headers: headers,
  });
  return handleResponse<GetAllUsersSuccessResponse>(response);
};

export const requestPasswordRecovery = async (email: string): Promise<PasswordRecoverySuccessResponse> => {
  const response = await fetch(`${BASE_URL}/auth/request-password-recovery`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email }),
  });
  return handleResponse<PasswordRecoverySuccessResponse>(response);
};

export const initiateGoogleLogin = async (): Promise<AuthSuccessResponse> => {
  const response = await fetch(`${BASE_URL}/auth/google/initiate`, {
    method: 'GET', // As defined in the backend route
    headers: {
      'Content-Type': 'application/json',
    },
  });
  return handleResponse<AuthSuccessResponse>(response);
};
