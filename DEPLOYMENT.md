# Deployment Guide

This document outlines the basic steps to build the application for production and considerations for deployment.

## Build Process

The application is built using Vite. To create a production-ready build, run the following command from the project root:

```sh
npm run build
```

This command will:
1.  Compile TypeScript code.
2.  Bundle JavaScript and CSS assets.
3.  Optimize static assets for production.
4.  Output the built application to the `dist/` directory.

The `dist/` directory will contain static assets (`index.html`, JavaScript bundles, CSS files, images, etc.) that can be served by any static web server.

## Deployment

Once the application is built, the contents of the `dist/` directory can be deployed to any static hosting provider. Common options include:

*   **Firebase Hosting**
*   **Netlify**
*   **Vercel**
*   **GitHub Pages**
*   **AWS S3 + CloudFront**
*   **Google Cloud Storage**

### General Steps for Deployment:

1.  **Build the Application:** Run `npm run build` to generate the `dist/` directory.
2.  **Choose a Hosting Provider:** Select a provider that suits your needs.
3.  **Configure the Provider:**
    *   Set up a new site/project on your chosen platform.
    *   Configure the build settings if the provider builds the app for you (e.g., specify the build command `npm run build` and the publish directory `dist`).
    *   If deploying manually, upload the contents of the `dist/` directory to the provider's designated storage or deployment target.
4.  **Set Up Routing for Single Page Application (SPA):**
    *   Since this is a React application using client-side routing (React Router), ensure your hosting provider is configured to handle SPA routing. This usually means redirecting all paths to `index.html` to allow React Router to manage the navigation. Most modern static hosting providers have straightforward ways to configure this (e.g., rewrite rules).

### Example: Deploying to a simple static server

If you have a simple HTTP server (like `serve` or Python's `http.server`), you can test the production build locally:

1.  Build the app: `npm run build`
2.  Navigate to the `dist` directory: `cd dist`
3.  Serve the contents:
    *   Using `serve`: `npx serve`
    *   Using Python: `python -m http.server`
    This will typically make the app available at `http://localhost:<port>`.

## Environment Variables

If the application requires environment variables for production (e.g., API keys, backend URLs), these should be managed according to the hosting provider's recommendations. Vite handles environment variables through `.env` files (e.g., `.env.production`). Ensure these are correctly configured and secured.

Refer to the specific documentation of your chosen hosting provider for detailed deployment instructions.
```
