<div align="center">
  <img src="project69-main/flutter_01.png" alt="Sentinel Mesh Logo" width="200" />
  
  # 🚨 Sentinel Mesh – The Offline Guardian

  **A multi-layer IoT and AI-powered safety network designed to provide real-time emergency detection, offline threat analysis, and rapid alert transmission.**

  [![Flutter](https://img.shields.io/badge/Flutter-%2302569B.svg?style=for-the-badge&logo=Flutter&logoColor=white)](https://flutter.dev/)
  [![React](https://img.shields.io/badge/React-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)](https://reactjs.org/)
  [![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
  [![Arduino](https://img.shields.io/badge/-Arduino-00979D?style=for-the-badge&logo=Arduino&logoColor=white)](https://www.arduino.cc/)
  [![Firebase](https://img.shields.io/badge/Firebase-039BE5?style=for-the-badge&logo=Firebase&logoColor=white)](https://firebase.google.com/)
</div>

---

## 📖 Overview

Sentinel Mesh ensures that emergency alerts reach trusted contacts and nearby responders **even when traditional cellular or WiFi networks fail**. By leveraging a custom ESP32-based hardware wearable, LoRa mesh networking, and an advanced AI engine, Sentinel Mesh acts as your ultimate safety companion.

---

## 🤖 Artificial Intelligence Engine

Sentinel Mesh utilizes a highly redundant, multi-provider AI engine to analyze emergencies in real-time.

| AI Model / Service | Purpose |
|-------------------|---------|
| **Groq (Llama 3.3)** | Blazing-fast text-based incident report generation and situational reasoning. |
| **Gemini Flash** | Analyzes video/image evidence during an SOS to determine threat severity and weapon presence. |
| **YOLO Vision** | On-device machine learning for detecting weapons directly from the live camera feed. |
| **Audio AI** | Analyzes ambient sounds (screams, sirens) to provide immediate context. |

> **Multi-Tier Fallback System**: If video analysis fails or quotas are depleted, the system cascades automatically to lighter text models or offline hardcoded reports, ensuring an emergency report is always generated.

---

## 🎯 Key Features

- 🆘 **Redundant SOS Trigger**: Activated via the Flutter mobile app or the dedicated hardware button.
- 📉 **Intelligent Fall Detection**: Automatically triggers an SOS upon detecting free fall and impact using MPU6050 logic.
- 📍 **Live Location Tracking**: Broadcasts the victim's location in real-time to the cloud and nearby users.
- 📡 **Community Responder Radar**: Alerts localized responders and provides a live radar/distance tracker.
- 📹 **Automated Evidence Recording**: Captures and safely stores video/audio evidence in the cloud.

---

## 📂 Repository Structure

```text
SentinelMesh/
├── 📱 project69-main/              # Flutter Mobile Application
├── 💻 sentinel-web-app/            # React/Vite Web Dashboard
├── 🔌 firmware/SentinelMesh/       # ESP32 C++ Hardware Code
├── ☁️ cloud_functions/             # Firebase Cloud Functions / Backend
└── 🎨 stitch_sentinel_mesh_safety/ # UI Mockups & Design Assets
```

---

## 🛠 Hardware Components

- **ESP32 Microcontroller**: The core processor handling sensor data, FreeRTOS tasks, and communication.
- **MPU6050 / MPU6500**: Accelerometer & Gyroscope for the three-step intelligent fall detection algorithm.
- **NEO-6M GPS Module**: Provides accurate, real-time location data directly from satellites.
- **LoRa Module (SX1278)**: Enables long-range emergency broadcasting without cellular networks or WiFi.
- **SIM800L**: GSM module for cellular fallback, SMS, and voice calls to emergency services.

---

## 🚀 Getting Started

### 1. Hardware Firmware Setup
1. Open `firmware/SentinelMesh/SentinelMesh.ino` in the Arduino IDE.
2. Install required libraries: `LoRa`, `TinyGPS++`.
3. Configure your API keys, APN, and Emergency Contacts in `config.h`.
4. Compile and flash to your ESP32.

### 2. Web Dashboard Setup
The web app is built with React, Vite, and Tailwind CSS v4.
```bash
cd sentinel-web-app
npm install
npm run dev
```

### 3. Mobile App Setup
The mobile application is built with Flutter.
```bash
cd project69-main
flutter pub get
flutter run
```

---
<div align="center">
  <i>Stay Safe. Stay Connected. Even Offline.</i>
</div>