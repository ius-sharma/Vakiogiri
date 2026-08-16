# 🎬 Vakiogiri - AI Video Clipping Platform

> Transform long YouTube videos into viral, vertical short-form clips (9:16) with AI in seconds.

---

## ✨ Features

- **⚡ Instant YouTube Clipping**: Paste any YouTube link, choose clip duration (30s, 45s, 60s), and generate vertical cuts.
- **🔒 Supabase Authentication**: Google 1-Click login and Email authentication.
- **🛡️ Daily Free Quota**: Built-in 3 generations/day credit system with UTC midnight auto-reset.
- **☁️ Supabase Cloud Storage**: Generated video clips are uploaded to Supabase Public Bucket with high-speed CDN streaming.
- **🧹 Zero Disk Waste**: Raw video downloads and local clip cache are automatically wiped immediately upon cloud sync.
- **📂 "My Clips" History Gallery**: Easily access, play, and 1-click download all your past video generation projects.
- **📥 Direct MP4 Downloads**: Forced browser attachment downloads with 0 redirects or popups.

---

## 🛠️ Tech Stack

- **Backend**: FastAPI, Python 3.10+, `yt-dlp`, PyJWT, SQLite
- **Frontend**: Next.js 16 (App Router), React 19, Tailwind CSS v4, Supabase JS SDK
- **Storage & Auth**: Supabase Auth (OAuth / Email) + Supabase Object Storage

---

## 🚀 Quick Setup Guide

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/vakiogiri.git
cd vakiogiri
```

### 2. Backend Setup
```bash
# Install Python dependencies
pip install -r requirements.txt

# Create .env from template
cp .env.example .env

# Run FastAPI backend
uvicorn main:app --reload --port 8000
```

### 3. Frontend Setup
```bash
cd frontend

# Install Node dependencies
npm install

# Create environment file from template
cp .env.example .env.local

# Run Next.js frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## ⚙️ Environment Variables

### Backend (`.env`):
```env
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-or-anon-key
SUPABASE_STORAGE_BUCKET=clips
SUPABASE_JWT_SECRET=your-supabase-jwt-secret
```

### Frontend (`frontend/.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
```

---

## 📄 License
MIT License. Created with ❤️ by Vakiogiri Team.
