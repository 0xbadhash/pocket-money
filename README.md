## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

*   Node.js (v18.x or later recommended)
*   npm (comes with Node.js)

### Installation & Running

1.  Clone the repo:
    ```sh
    git clone <your-repo-url>
    ```
2.  Navigate to the project directory:
    ```sh
    cd <project-directory-name>
    ```
3.  Install NPM packages:
    ```sh
    npm install
    ```
4.  Run the development server:
    ```sh
    npm run dev
    ```
    This will typically start the application on `http://localhost:5173`. Open this URL in your browser to see the app.

### Running Tests

This project uses Jest and React Testing Library for unit and integration tests. To run the tests:

```sh
npm test
```

To run tests with coverage report:

```sh
npm test -- --coverage
```

### Building for Production

To create a production build, run:
```sh
npm run build
```
This will create a `dist` folder with the optimized static assets.
