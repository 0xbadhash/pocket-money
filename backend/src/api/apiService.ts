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
interface UserApiResponse extends Omit<AppUser, 'createdAt' | 'updatedAt' | 'kids' | 'parentAccountId' | 'age'> {
  // Define more accurately based on actual backend responses for login/register
}


interface LoginSuccessResponse {
  data: {
    user: ParentUser;
    token: string;
  };
}

interface RegisterSuccessResponse {
  data: {
    user: ParentUser;
    token: string;
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
  // Token check can be more robust or handled by interceptors in a real app
  // if (!authToken) {
  //   return Promise.reject({ error: { code: 'AUTH_TOKEN_MISSING', message: 'Authentication token is required.' }});
  // }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  // if (authToken) { // Backend /auth/users is not currently protected
  //   headers['Authorization'] = `Bearer ${authToken}`;
  // }

  const response = await fetch(`${BASE_URL}/auth/users`, { // Endpoint from backend setup
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
