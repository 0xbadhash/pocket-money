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

### Building for Production

To create a production build, run:
```sh
npm run build
```
This will create a `dist` folder with the optimized static assets.

## Features

This application helps manage pocket money and chores for kids. Key features include:

*   User and kid profile management.
*   Funds tracking (deposits, rewards).
*   Chore creation and assignment.
*   **Interactive Kanban Board:** A visual interface to view and manage a child's assigned chores using user-configurable columns (e.g., "To Do", "In Progress", "Done", managed in Settings). Supports drag-and-drop (with enhanced visual feedback during drag operations) for reordering chores within columns (with order persistence) and moving chores between these dynamic columns. Features include selection of daily, weekly, or monthly periods, column theming, reward filtering, and multiple sorting options (including custom order).
*   Activity Monitoring: View transaction and chore completion history.
*   Settings Management: Customize user and kid profiles, including setting up default Kanban columns for new kids.
*   Light and Dark Themes: User-selectable themes for visual preference.
