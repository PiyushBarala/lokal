<div align="center">

# 🎵 Lokal

**A fast, beautiful, offline-first local music player for Windows.**

Built with Electron, React, TypeScript, Tailwind CSS, and SQLite.

[![License: GPL v3](https://img.shields.io/badge/License-GPLv3-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%2010%20%2F%2011-0078D4.svg)](#)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![Electron](https://img.shields.io/badge/Electron-31-47848F.svg)](https://www.electronjs.org/)

</div>

---

## ✨ Features

- ⚡ **Local-First & Offline**: Instant startup, zero telemetry, and pure local SQLite database indexing.
- 🎨 **Immersive Experience**:
  - **Dynamic Fluid Mesh Canvas**: Apple Music-inspired organic gradient background that animates and swirls dynamically to the album palette while music is playing, and smoothly freezes when paused.
  - **3D Parallax Tilt**: Interactive album artwork that tilts relative to cursor motion with dynamic specular holographic glare.
  - **Ambient Idle Mode**: Subtle fade-out of controls after inactivity, leaving a glowing hairline progress bar and a floating "Up Next" glass pill.
- 🎧 **Windows 11 Integration**:
  - Full **System Media Transport Controls (SMTC)** integration (Windows Action Center, Lock Screen, and Bluetooth headset button controls for play/pause/skip).
  - Frameless window with custom Fluent title bar and multi-monitor fullscreen support.
- 📂 **Smart Library & Curation**:
  - Auto-extracts embedded ID3 metadata, album art, bitrate, and duration.
  - Curated Home sections: *On Repeat*, *Made For You Artist Mixes*, *Fresh In Library*, and *Featured Albums*.
  - Full-text instant search across songs, artists, and albums.
  - Custom playlists, track reordering, and context menus.
- 💾 **Session Auto-Resume**:
  - Remembers your exact queue, track, and playback timestamp across app restarts and resumes playback seamlessly.

---

## 🛠️ Tech Stack

- **Runtime**: [Electron](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- **Frontend**: [React 18](https://react.dev/), [TypeScript](https://www.typescriptlang.org/), [Tailwind CSS](https://tailwindcss.com/)
- **State Management**: [Zustand](https://github.com/pmndrs/zustand)
- **Database**: [sql.js](https://sql.js.org/) (In-memory SQLite with persistent disk sync)
- **Audio Metadata**: [music-metadata](https://github.com/Borewit/music-metadata)

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or later)
- npm or yarn

### Installation & Run

```bash
# Clone the repository
git clone https://github.com/PiyushBarala/lokal.git
cd lokal

# Install dependencies
npm install

# Start development mode
npm run dev
```

### Packaging for Windows

```bash
# Build standalone installer / portable executable
npm run build:exe
```

Output installers and binaries will be generated inside the `dist/` directory.

---

## 📦 Optional Tools (yt-dlp & ffmpeg)

Lokal supports audio retrieval for personal offline playback. To use these optional features, place the following binaries in `resources/bin/`:

- `yt-dlp.exe` — [Official Releases](https://github.com/yt-dlp/yt-dlp/releases/latest)
- `ffmpeg.exe` — [Gyan.dev Builds](https://www.gyan.dev/ffmpeg/builds/)

Alternatively, ensure `yt-dlp` and `ffmpeg` are accessible in your system `PATH`.

---

## ⚖️ Disclaimer

Lokal is an open-source audio player designed for organizing and playing personal, local music libraries. Any supplementary network or download capabilities are provided strictly for public domain, Creative Commons, or personal media that the user has the explicit legal right to use. The developers do not host, store, or distribute copyrighted content, and do not encourage copyright infringement.

---

## 📄 License

This project is licensed under the **GNU General Public License v3.0 (GPL-3.0)**. See the [LICENSE](LICENSE) file for details.
