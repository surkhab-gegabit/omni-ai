# OmniAI 🧠

![Version](https://img.shields.io/badge/version-v1.2.0-blue.svg)
![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)

OmniAI is a native, privacy-first desktop AI orchestrator. It bridges the gap between cloud-based Large Language Models (ChatGPT, Claude, Gemini) and offline, air-gapped local inference engines (Llama 3) through a unified, fluid, native desktop interface.

Built on an **Electron** architecture, this application utilizes **Playwright** for headless browser automation and native **Node.js** bindings for real-time hardware telemetry.

---

## ✨ System Architecture & Key Features

### 1. The Auto-Routing Engine
Instead of relying on rate limited public APIs, OmniAI utilizes a hidden Playwright stealth browser layer to securely orchestrate prompts directly through the native web interfaces of ChatGPT, Claude, and Gemini. 
* Implements `puppeteer-extra-plugin-stealth` to bypass strict automation detection.
* Uses Electron's `ipcMain` and `ipcRenderer` to securely bridge UI inputs to the background browser context.

### 2. Air-Gapped Local Inference (Ollama)
For maximum privacy and offline capability, OmniAI seamlessly integrates with **Ollama** to run large language models directly on physical hardware.
* Routes requests to `localhost:11434` to run Meta's Llama 3 model locally.
* Zero data leaves the machine when the "Local Llama" engine is engaged.

### 3. Real-Time Hardware Telemetry
The application monitors system load in real time, providing crucial visibility into CPU and RAM consumption when running heavy local neural networks.
* Taps into Node.js native `os` module for accurate system polling.
* Broadcasts telemetry streams at 10Hz via secure Electron IPC channels to a dynamic React dashboard.

### 4. Fluid Physics UI & Native Controls
The frontend is engineered to feel like a premium, native operating system utility rather than a packaged website.
* Custom, draggable title bar with native window controls (Minimize, Maximize, Close).
* **Framer Motion** spring-physics for natural window scaling, layout shifts, and tab sliding.
* Native system-level background translucency (Windows Acrylic/macOS Vibrancy).

---

## 🛠️ Technology Stack

* **Core:** Electron, Node.js
* **Frontend:** React, TypeScript, Vite, Tailwind CSS
* **Animation:** Framer Motion
* **Automation Engine:** Playwright, Chromium
* **Local Inference:** Ollama (Llama 3)
* **CI/CD:** GitHub Actions (Automated `electron-builder` releases)

---

## 🚀 Getting Started (Local Development)

### Prerequisites
1. [Node.js](https://nodejs.org/) and `pnpm` installed.
2. [Ollama](https://ollama.com/) installed for local AI capabilities.

### Installation

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/surkhab-gegabit/omni-ai.git](https://github.com/surkhab-gegabit/omni-ai.git)
   cd omni-ai