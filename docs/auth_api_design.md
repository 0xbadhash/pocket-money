# Authentication and Admin API Design (Conceptual)

This document outlines the conceptual API endpoints for user authentication (custom and Google Sign-In) and basic admin user management.

## General Considerations

-   **Base URL:** `/api/v1` (example)
-   **Authentication:** Endpoints requiring authentication will expect a JWT in the `Authorization` header (`Bearer <token>`).
-   **Error Responses:** Consistent error response format, e.g.:
    ```json
    {
      "error": {
        "code": "ERROR_CODE",
        "message": "Descriptive error message"
      }
    }
    ```

## User Types (from `src/types.ts`)

-   `ParentUser`
-   `KidUser`
-   `AdminUser`
-   `UserRole` (enum: `parent`, `kid`, `admin`)

---

## Custom Authentication Endpoints

### 1. User Registration (Parent)

-   **Endpoint:** `POST /auth/register/parent`
-   **Description:** Registers a new parent user.
-   **Request Body:**
    ```json
    {
      "name": "John Doe",
      "email": "john.doe@example.com",
      "password": "securePassword123"
    }
    ```
-   **Success Response (201):**
    ```json
    {
      "data": {
        "user": {
          "id": "user-uuid-123",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "role": "parent",
          "createdAt": "2023-10-27T10:00:00Z"
        },
        "token": "jwt.access.token"
      }
    }
    ```
-   **Possible Errors:** `EMAIL_EXISTS`, `VALIDATION_ERROR`.

### 2. User Login (Email/Password)

-   **Endpoint:** `POST /auth/login`
-   **Description:** Logs in an existing user (parent or admin).
-   **Request Body:**
    ```json
    {
      "email": "john.doe@example.com",
      "password": "securePassword123"
    }
    ```
-   **Success Response (200):**
    ```json
    {
      "data": {
        "user": {
          "id": "user-uuid-123",
          "name": "John Doe",
          "email": "john.doe@example.com",
          "role": "parent", // or "admin"
          // other relevant user fields
        },
        "token": "jwt.access.token"
      }
    }
    ```
-   **Possible Errors:** `INVALID_CREDENTIALS`, `ACCOUNT_LOCKED`.

### 3. User Logout

-   **Endpoint:** `POST /auth/logout`
-   **Description:** Logs out the currently authenticated user (invalidates token if using server-side session or denylist).
-   **Request Body:** (None, or token if not using Authorization header for some reason)
-   **Success Response (200):**
    ```json
    {
      "data": {
        "message": "Logout successful"
      }
    }
    ```
-   **Possible Errors:** `AUTHENTICATION_REQUIRED`.

---

## Google Sign-In Endpoints

### 1. Initiate Google Sign-In

-   **Endpoint:** `GET /auth/google/initiate`
-   **Description:** Redirects the user to Google's OAuth 2.0 consent screen.
-   **Response:** HTTP 302 Redirect to Google.
    -   Backend constructs the Google OAuth URL with necessary parameters (client ID, redirect URI, scopes).

### 2. Handle Google Sign-In Callback

-   **Endpoint:** `GET /auth/google/callback`
-   **Description:** Handles the callback from Google after user consent. Exchanges the received code for tokens, then finds or creates a user account.
-   **Query Parameters (from Google):** `code`, `state` (optional)
-   **Success Response (200):** (Similar to custom login, issues a JWT for the application)
    ```json
    {
      "data": {
        "user": {
          "id": "user-uuid-456",
          "name": "Jane Doe (Google)",
          "email": "jane.doe.google@example.com",
          "role": "parent", // Assuming Google sign-ins are for parents by default
        },
        "token": "jwt.access.token"
      }
    }
    ```
-   **Possible Errors:** `GOOGLE_AUTH_ERROR`, `EMAIL_ALREADY_REGISTERED_CUSTOM`.

---

## Admin User Management Endpoints (Requires Admin Role)

### 1. List Users

-   **Endpoint:** `GET /admin/users`
-   **Description:** Retrieves a list of all users, with optional filtering.
-   **Query Parameters:**
    -   `role` (e.g., `parent`, `kid`, `admin`)
    -   `page` (e.g., `1`)
    -   `limit` (e.g., `20`)
    -   `searchTerm` (for name/email)
-   **Success Response (200):**
    ```json
    {
      "data": [
        // Array of AppUser objects
      ],
      "pagination": {
        "currentPage": 1,
        "totalPages": 5,
        "totalUsers": 100
      }
    }
    ```
-   **Possible Errors:** `AUTHENTICATION_REQUIRED`, `FORBIDDEN_ACCESS`.

### 2. Get User Details

-   **Endpoint:** `GET /admin/users/{userId}`
-   **Description:** Retrieves detailed information for a specific user.
-   **Success Response (200):**
    ```json
    {
      "data": {
        // Full AppUser object (ParentUser, KidUser, or AdminUser)
      }
    }
    ```
-   **Possible Errors:** `USER_NOT_FOUND`, `AUTHENTICATION_REQUIRED`, `FORBIDDEN_ACCESS`.

### 3. Update User (Admin Action)

-   **Endpoint:** `PUT /admin/users/{userId}`
-   **Description:** Allows an admin to update certain user details (e.g., role, account status).
-   **Request Body:** (Fields to update, e.g.)
    ```json
    {
      "role": "admin", // Example: promoting a parent to admin
      "accountStatus": "suspended" // Example: suspending an account
    }
    ```
-   **Success Response (200):**
    ```json
    {
      "data": {
        // Updated AppUser object
      }
    }
    ```
-   **Possible Errors:** `USER_NOT_FOUND`, `VALIDATION_ERROR`, `CANNOT_UPDATE_SELF_CRITICAL_INFO`.

### 4. Create Kid Account (Admin/Parent Action)
*(This might also be a parent-specific endpoint, but an admin version is useful)*

-   **Endpoint:** `POST /admin/users/{parentId}/kids` (or `POST /parents/{parentId}/kids`)
-   **Description:** Creates a new kid account linked to a parent.
-   **Request Body:**
    ```json
    {
      "name": "Child Name",
      "age": 8
      // Other KidUser fields
    }
    ```
-   **Success Response (201):**
    ```json
    {
      "data": {
        // KidUser object
      }
    }
    ```

---
## Notes on Backend Implementation

-   **Password Hashing:** Use a strong, salted hashing algorithm (e.g., bcrypt, Argon2) for custom credentials.
-   **OAuth 2.0 Flow:** Securely handle the Google OAuth 2.0 flow, including state parameter for CSRF protection.
-   **Permissions & Roles:** Implement robust role-based access control (RBAC) for admin endpoints.
-   **Database:** Choose a suitable database and design schemas for users, roles, and potentially audit logs.
-   **Security:** Address common web vulnerabilities (XSS, CSRF, SQL Injection, etc.).
-   **MFA:** Multi-Factor Authentication implementation would require additional endpoints and logic (e.g., for setting up TOTP, verifying codes). This design does not yet cover MFA specifics.
