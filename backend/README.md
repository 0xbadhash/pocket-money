# Kid Finance App - Backend

This directory contains the backend server for the Kid Finance App. It's built with Node.js and Express.js.

## Prerequisites

-   Node.js (which includes npm) installed on your system.

## Running the Server (Conceptual)

1.  **Navigate to the backend directory:**
    ```bash
    cd path/to/your/project/backend
    ```

2.  **Install Dependencies:**
    From within the `backend` directory, run the following command to install the necessary Node.js packages listed in `package.json`:
    ```bash
    npm install
    ```
    *(This step installs dependencies like Express.js. The subtask worker may have already performed this if it had the capability.)*

3.  **Start the Server:**
    Once dependencies are installed, you can start the server using:
    ```bash
    npm start
    ```
    This will run the `src/server.js` file using Node.js.

4.  **Start in Development Mode (with auto-restart):**
    For development, you can use the `dev` script which utilizes Node's `--watch` flag to automatically restart the server when files change:
    ```bash
    npm run dev
    ```

The server will typically start on `http://localhost:3001` (or the port specified by the `PORT` environment variable). You should see a message in the console confirming that the server is running.

## API Endpoints

Currently, the following placeholder API endpoints are available under the `/api/v1/auth` prefix:

-   `POST /register/parent`: Registers a new parent user.
    -   Request body: `{ "name": "John Doe", "email": "john.doe@example.com", "password": "securePassword123" }`
-   `POST /login`: Logs in an existing user.
    -   Request body: `{ "email": "john.doe@example.com", "password": "securePassword123" }`

**Note:** This is a conceptual, scaffolded backend. It uses an in-memory data store (data will be lost on server restart) and does not implement proper security measures like password hashing, real JWTs, or comprehensive input validation. It's intended as a starting point for further development.
