# Real-Time Collaborative Coding Classroom Project

## Overview
The Real-Time Collaborative Coding Classroom Project is designed to facilitate interactive coding sessions among students and instructors. It provides a platform for real-time code collaboration, allowing users to write, edit, and execute code together seamlessly.

## Features
- Real-time code collaboration
- Syntax highlighting for multiple programming languages
- In-browser code execution
- User authentication and role management
- Integrated chat for communication
- Session management and history tracking

## Installation Instructions
To set up the project locally, follow these steps:

1. Clone the repository:
   ```bash
   git clone https://github.com/agbuddy7/co-code.git
   cd co-code
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Configure environment variables:
   Create a `.env` file in the root directory and add the required environment variables.

4. Start the application:
   ```bash
   npm start
   ```

## Usage Guide
1. Open your browser and navigate to `http://localhost:3000`.
2. Create a new session or join an existing one using the session ID.
3. Start coding collaboratively with your peers.

## API Documentation
The project provides a RESTful API for interaction with the backend. Key endpoints include:

- `POST /api/sessions`: Create a new coding session.
- `GET /api/sessions/:id`: Retrieve session details.
- `POST /api/code`: Submit code for execution.
- `GET /api/history`: Fetch session history.

Refer to the API documentation for detailed usage and examples.

## Technology Stack
- Frontend: React, Redux, CSS
- Backend: Node.js, Express
- Database: MongoDB
- Real-time communication: Socket.IO

## Project Structure
```
co-code/
├── client/               # Frontend code
├── server/               # Backend code
├── .env                  # Environment variables
├── package.json          # Project metadata and dependencies
└── README.md             # Project documentation
```
