# min-chat

Lightweight real-time chat server and frontend built with Node.js, Express and Socket.IO.

This repository contains a sample multi-room chat application with simple file upload support, private rooms via invite codes, typing indicators, and a responsive Tailwind-based UI.

## Features
- Multi-room chat with public and private (invite-only) rooms
- Unique username selection per session
- Real-time messaging with Socket.IO
- Typing indicator, join/leave notifications, and simple file uploads (images, pdf, text)
- Basic rate-limiting and upload size/type limits on the server

## Prerequisites
- Node.js 18+ and npm

## Quick start

1. Install dependencies

```bash
npm install
```

2. Start the server

```bash
npm start
# or
node server.js
```

3. Open the app in your browser

```
http://localhost:3000
```

## Development

- Edit server code in `server.js` and frontend files in `public/`.
- The project uses ES modules (see `type: "module"` in `package.json`).

Recommended dev tasks you can add:
- Add `nodemon` for live-reloading the server during development.
- Add ESLint + Prettier for consistent formatting and linting.

## Security notes & operational considerations

- Uploaded files are currently stored in `public/uploads` and served statically. For production, store uploads outside the static folder and serve them via a controlled endpoint with proper Content-Type and Content-Disposition headers.
- The server enforces a 5MB upload limit and a simple MIME whitelist, but you should tighten validation for your use case.
- There is no persistent authentication: usernames are session-scoped and not password-protected. Add a proper auth system if you require account permanence or stronger identity guarantees.

## Folder structure

```
├── server.js          # Main Express + Socket.IO server
├── public/            # Frontend files (served statically)
│   ├── index.html     # Main UI
│   ├── main.js        # Frontend logic
│   └── uploads/       # Uploaded files (runtime)
├── package.json       # Scripts & dependencies
```
