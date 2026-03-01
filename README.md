# SyncBoard - Real-Time Collaboration Whiteboard

A collaborative whiteboard application that enables multiple users to draw together in real-time using P2P WebRTC connections for low-latency synchronization.

## ✨ Features

- **Real-Time Drawing** - See others draw instantly with P2P WebRTC data channels
- **Multiple Drawing Tools** - Pen, eraser, line, rectangle, and circle
- **Color & Size Picker** - Full color palette with adjustable stroke sizes
- **Live Cursor Tracking** - See where other users are drawing in real-time
- **Room-Based Collaboration** - Create or join rooms with shareable IDs
- **Google OAuth** - Secure authentication with Google accounts
- **Persistent Storage** - Drawings are saved to MongoDB for later access
- **Export to PNG** - Download your whiteboard as an image

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, Vite |
| Drawing | Canvas API |
| Real-time | WebRTC DataChannels, Socket.io |
| Backend | Node.js, Express |
| Database | MongoDB, Mongoose |
| Auth | Google OAuth 2.0, Passport.js |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- MongoDB (local or Atlas)
- Google OAuth credentials

### Setup

1. **Clone and install dependencies**

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

2. **Configure environment variables**

Copy `.env.example` to `.env` in the server folder:

```bash
cd server
cp .env.example .env
```

Update the `.env` file with your credentials:

```env
PORT=3001
MONGODB_URI=mongodb://localhost:27017/whiteboard
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
SESSION_SECRET=your_session_secret
CLIENT_URL=http://localhost:5173
```

3. **Start the development servers**

```bash
# Terminal 1 - Start backend
cd server
npm run dev

# Terminal 2 - Start frontend
cd client
npm run dev
```

4. **Open your browser**

Navigate to `http://localhost:5173`

## 📜 License

