// src/api/apiService.ts
import { AppUser, ParentUser } from '../types'; // Ensure AppUser is imported

const BASE_URL = 'http://localhost:3001/api/v1';

interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}

// Assuming AppUser is the general type for users from your src/types.ts
interface UserApiResponse {
  id: string;
  name: string;
  email: string;
  role: 'parent' | 'kid' | 'admin'; // Match UserRole enum values
  // Add other fields that are common and safe to send to client
}

interface LoginSuccessResponse {
  data: {
    user: UserApiResponse; // Use UserApiResponse or a more specific one like ParentUserApiResponse
    token: string;
  };
}

interface RegisterSuccessResponse {
  data: {
    user: UserApiResponse; // Use UserApiResponse
    token: string;
  };
}

interface GetAllUsersSuccessResponse {
  data: {
    users: AppUser[]; // Expecting an array of AppUser from backend
    count: number;
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

export const loginUser = async (email: string, password_param: string): Promise<LoginSuccessResponse> => {
  const response = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password: password_param }),
  });
  return handleResponse<LoginSuccessResponse>(response);
};

export const registerParent = async (name: string, email: string, password_param: string): Promise<RegisterSuccessResponse> => {
  const response = await fetch(`${BASE_URL}/auth/register/parent`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name, email, password: password_param }),
  });
  return handleResponse<RegisterSuccessResponse>(response);
};

export const getAllUsers = async (authToken: string | null): Promise<GetAllUsersSuccessResponse> => {
  if (!authToken) {
    // Or handle this more gracefully depending on app flow
    return Promise.reject({ error: { code: 'AUTH_TOKEN_MISSING', message: 'Authentication token is required.' }});
  }
  const response = await fetch(`${BASE_URL}/auth/users`, { // Assuming /auth/users from backend setup
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      // 'Authorization': `Bearer ${authToken}`, // TODO: Uncomment when backend expects token for this route
    },
  });
  return handleResponse<GetAllUsersSuccessResponse>(response);
};
