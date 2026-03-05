# Melodix 🎵

**Live Demo:** [Melodix.app](https://melodix-frontend-beta.vercel.app/)

**Melodix** is a premium, full-stack music streaming platform that allows users to discover, play, and manage their favorite tracks. It features a sophisticated audio streaming pipeline that extracts high-quality audio directly from multiple sources, providing a seamless and responsive listening experience.

## ✨ Features

- **Advanced Audio Streaming:** High-quality MP3 streaming using a custom `yt-dlp` + `ffmpeg` pipeline.
- **Dynamic Real-time Search:** Instantly find tracks, artists, and albums.
- **Global Music Discovery:** Access a vast library of music with real-time audio extraction.
- **Premium Dark UI:** A sleek, glassmorphic interface built for music enthusiasts, fully responsive across all devices.
- **User Authentication:** Secure JWT-based auth with MongoDB for persistence.
- **Custom Playlists:** Create and curate your own music collections.

## 🛠️ Tech Stack

### Frontend
- **React 18 / Vite**: Modern, lightning-fast development and production builds.
- **Tailwind CSS**: Professional styling with custom themes and glassmorphism.
- **Lucide React**: Clean and consistent iconography.
- **Vercel**: Optimized frontend hosting.

### Backend
- **Node.js / Express 5**: Cutting-edge backend framework for high-performance APIs.
- **MongoDB / Mongoose**: Robust data persistence for users and playlists.
- **FFmpeg & yt-dlp**: Real-time audio extraction and transcoding.
- **Leapcell**: Cloud-native deployment for the streaming engine and API.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- MongoDB
- `ffmpeg` and `yt-dlp` installed on your system (for local streaming)

### 1. Clone the repository
```bash
git clone https://github.com/Sanjeeb-J/Melodix.git
cd Melodix
```

### 2. Backend Setup
```bash
cd backend
npm install
# Configure .env with your MONGO_URI, JWT_SECRET, and PORT
npm start
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
# Configure .env with VITE_API_URL
npm run dev
```

The application will be running at `http://localhost:5173` (Frontend) and your configured backend port.

## 📁 Project Structure

```text
Melodix/
├── backend/          # Express 5 server, FFmpeg/yt-dlp pipeline, Models, Routes
├── frontend/         # React 18 + Vite application
│   ├── src/
│   │   ├── components/ # Core UI components (Player, Sidebar, etc.)
│   │   ├── pages/      # View layouts (Home, Search, Dashboard)
│   │   ├── services/   # API and Streaming logic
│   │   └── context/    # Global state management
├── README.md         # Current documentation
└── LICENSE           # MIT License
```

## 🤝 Contributing

Contributions are welcome! Please feel free to open a Pull Request.

## 📄 License

This project is licensed under the **MIT License**.

## 👨‍💻 Developer

**Sanjeeb J**  
*Full-Stack Web Developer*  
[GitHub Profile](https://github.com/Sanjeeb-J)
