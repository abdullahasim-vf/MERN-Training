# Test Backend

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the server:
   ```bash
   npm start
   ```

The server will run on port 3000 by default.

## Endpoints
- `POST /users` - Create a user
- `GET /users` - Get all users
- `GET /users/:id` - Get a user by ID
- `PUT /users/:id` - Update a user by ID
- `DELETE /users/:id` - Delete a user by ID

## Notes
- The MongoDB connection uses a dummy URL. Update `mongoURI` in `server.js` to connect to a real database.
- Logger middleware prints the client IP, HTTP method, and URL for each request. 