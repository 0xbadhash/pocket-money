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
// This can be refined if backend sends a more specific subset of AppUser fields
interface UserApiResponse extends Omit<AppUser, 'createdAt' | 'updatedAt' | 'kids' | 'parentAccountId' | 'age'> {
  // Example: Exclude sensitive or large fields not needed for login/register response immediately
  // Adjust based on what backend actually sends for login/register
}


interface LoginSuccessResponse {
  data: {
    // user: UserApiResponse; // More specific if backend sends trimmed user object
    user: ParentUser; // Assuming login returns a ParentUser for now
    token: string;
  };
}

interface RegisterSuccessResponse {
  data: {
    // user: UserApiResponse;
    user: ParentUser; // Assuming register returns a ParentUser
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
    // This check can be done in the component or here.
    // If done here, the component won't need to pass a potentially null token.
    console.warn('getAllUsers called without authToken. This might be intended for public data, or an error.');
    // Depending on backend, you might allow this or throw an error.
    // For now, proceeding but real app would need stricter check or public endpoint.
  }
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  // TODO: Uncomment and use Authorization header when backend protects the /users route
  // if (authToken) {
  //   headers['Authorization'] = `Bearer ${authToken}`;
  // }

  const response = await fetch(`${BASE_URL}/auth/users`, {
    method: 'GET',
    headers: headers,
  });
  return handleResponse<GetAllUsersSuccessResponse>(response);
};
