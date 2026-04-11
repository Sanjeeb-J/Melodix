# Melodix

Melodix is a full-stack music streaming and playlist management application built for discovering tracks, organizing personal libraries, and playing music through a custom backend streaming pipeline.

The project combines a React frontend with an Express and MongoDB backend, supports account-based access, integrates YouTube and YouTube Music discovery flows, and streams audio through a server-side conversion pipeline using `yt-dlp`, `ytdl-core`, and `ffmpeg`.

## Live Demo

[Open Melodix](https://melodix-frontend-beta.vercel.app/)

## Overview

Melodix is designed as a personal streaming experience with a modern dashboard-style interface and a playlist-first workflow. Users can authenticate, create playlists manually or from YouTube playlist links, search for songs, add tracks to custom playlists, and play music directly inside the app.

On the backend, Melodix handles authentication, playlist persistence, track metadata, YouTube-powered search, and on-demand audio streaming. On the frontend, it provides a responsive music player, playlist library, search views, protected routes, and playback controls similar to a polished streaming product.

## Key Features

- Secure user authentication with JWT-based sessions
- Protected dashboard experience for signed-in users
- Personal playlist creation and management
- Import playlists from public YouTube playlist URLs
- Song search powered by YouTube Data API
- Extended discovery for playlists, albums, and artists via YouTube Music
- On-demand server-side audio streaming pipeline
- Queue controls, seek, shuffle, repeat, and volume management
- Responsive music player UI built for desktop and mobile
- MongoDB persistence for users and playlists

## Tech Stack

### Frontend

- React 18
- Vite
- React Router
- Tailwind CSS
- Lucide React

### Backend

- Node.js
- Express 5
- MongoDB with Mongoose
- JWT authentication
- Axios
- `youtubei.js`
- `@distube/ytdl-core`
- `yt-dlp`
- `ffmpeg` / `ffmpeg-static`

## Architecture

The repository is split into two main applications:

- `frontend/` contains the React client, routes, pages, contexts, services, and player UI
- `backend/` contains the API, controllers, models, middleware, YouTube integrations, and streaming pipeline

High-level flow:

1. Users authenticate through the backend API.
2. The frontend stores auth state and protects dashboard access.
3. Users search for tracks or import playlists from YouTube.
4. Playlist and song data are stored in MongoDB.
5. Audio is streamed from the backend through a YouTube-to-MP3 pipeline.

## Project Structure

```text
Melodix/
|-- backend/
|   |-- config/
|   |-- controllers/
|   |-- middleware/
|   |-- models/
|   |-- routes/
|   |-- utils/
|   `-- index.js
|-- frontend/
|   |-- public/
|   |-- src/
|   |   |-- assets/
|   |   |-- components/
|   |   |-- context/
|   |   |-- pages/
|   |   |-- services/
|   |   |-- styles/
|   |   `-- utils/
|   `-- vite.config.js
|-- package.json
`-- README.md
```

## API Areas

The backend currently exposes routes for:

- `auth` for registration and login
- `playlists` for playlist and song management
- `youtube` for search and discovery
- `stream` for audio streaming
- `test` for testing utilities

## Getting Started

### Prerequisites

Make sure the following are installed before running the project locally:

- Node.js 18 or newer
- npm
- MongoDB database
- `ffmpeg`
- `yt-dlp`

### 1. Clone the repository

```bash
git clone https://github.com/Sanjeeb-J/Melodix.git
cd Melodix
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

## Environment Variables

### Backend

Create `backend/.env` and configure the values your server needs:

```env
PORT=8080
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
YOUTUBE_API_KEY=your_youtube_data_api_key
YOUTUBE_COOKIE=optional_cookie_value
FFMPEG_PATH=optional_custom_ffmpeg_path
```

Notes:

- `MONGO_URI` is required for database connectivity
- `JWT_SECRET` is required for authentication
- `YOUTUBE_API_KEY` is required for YouTube search and playlist import
- `YOUTUBE_COOKIE` can help with streaming reliability for some YouTube requests
- `FFMPEG_PATH` is optional if `ffmpeg` is already available on your machine

### Frontend

Create `frontend/.env` and point the app to your backend API:

```env
VITE_API_URL=http://localhost:8080/api
```

## Running The Project

Start the backend:

```bash
cd backend
npm start
```

Start the frontend in a separate terminal:

```bash
cd frontend
npm run dev
```

By default, the frontend will run on Vite's local development server and connect to the backend through `VITE_API_URL`.

## Available Scripts

### Root

```bash
npm start
```

Starts the backend from the repository root.

### Frontend

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

### Backend

```bash
npm start
```

## Deployment Notes

- The frontend includes Vercel configuration and is suitable for deployment as a static React app
- The backend is structured as a standalone Node.js API service
- The backend repository includes deployment-related files such as `leapcell.yaml` and `nixpacks.toml`
- Production streaming requires `ffmpeg` and reliable access to `yt-dlp` or the fallback streaming flow

## Why Melodix

Melodix is more than a simple playlist CRUD app. It combines discovery, import, playback, and streaming infrastructure into one product-oriented codebase. That makes it a strong full-stack project for demonstrating frontend experience design, backend API development, third-party integration, media handling, and authenticated user flows.

## License

This project is licensed under the [MIT License](./LICENSE).

## Author

Created by [Sanjeeb J](https://github.com/Sanjeeb-J)
