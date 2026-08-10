# 🚨 Sentinel Mesh – The Offline Guardian

Sentinel Mesh is a multi-layer IoT and AI-powered safety network designed to provide real-time emergency detection, offline threat analysis, and rapid alert transmission. The system ensures that emergency alerts reach trusted contacts and nearby responders even when traditional networks fail.

## 🤖 Artificial Intelligence Engine

Sentinel Mesh utilizes a highly redundant, multi-provider AI engine to analyze emergencies in real-time, even when specific cloud services are down.

- **Groq (Llama 3.3 70B & Llama 3.1 8B)**: Provides blazing-fast text-based incident report generation and situational reasoning.
- **Gemini (2.0 Flash & 1.5 Flash)**: Analyzes video and image evidence captured during an SOS to determine threat severity, weapon presence, and environment details.
- **Multi-Tier Fallback System**: If video analysis fails or quotas are depleted, the system cascades automatically to lighter text models or offline hardcoded reports, ensuring an emergency report is always generated.
- **YOLO Vision Threat Detection**: On-device machine learning for detecting weapons and anomalies directly from the live camera feed.
- **Audio AI Service**: Analyzes ambient sounds (screams, sirens) to provide immediate context to the emergency.
- **Route Anomaly Service**: AI-powered detection of sudden route deviations or unsafe detours during travel.

## 🎯 Key Features

- **Redundant SOS Trigger**: Activated via mobile app or hardware button.
- **Intelligent Fall Detection**: Automatically triggers an SOS upon detecting free fall and impact.
- **Live Location Tracking**: Broadcasts the victim's location in real-time to the cloud and nearby users.
- **Community Responder Radar**: Alerts localized responders and provides a live radar/distance tracker to locate the victim.
- **Automated Evidence Recording**: Captures and safely stores video/audio evidence when an SOS is triggered.

## 🛠 Software Technologies Used

- **Flutter & Dart**: Cross-platform mobile application development.
- **Firebase**: Real-time database for syncing SOS alerts and cloud storage for uploading evidence.
- **Google Maps SDK**: Live tracking and routing to the victim.
- **WebSockets / Bluetooth Low Energy (BLE)**: Hardware-to-mobile communication.

## ⚙ Hardware Components

- **ESP32 Microcontroller**: The core processor handling sensor data and communication.
- **MPU6500 (Accelerometer & Gyroscope)**: Used for the three-step intelligent fall detection (free fall, impact, immobility).
- **NEO-6M GPS Module**: Provides accurate, real-time location data directly from satellites.
- **LoRa Module**: Enables long-range emergency broadcasting without cellular networks or WiFi.
