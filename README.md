# DigiAds Content Management Platform

A highly integrated content management system (CMS) and tabletop ordering platform designed for dual Android devices (Tabletop Ordering Tablet and Landscape Wall Screens) and Next.js web applications.

---

## 🛠️ Technology Stack

<p align="left">
  <img src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white" alt="Node.js" />
  <img src="https://img.shields.io/badge/Fastify-000000?style=for-the-badge&logo=fastify&logoColor=white" alt="Fastify" />
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=for-the-badge&logo=mongodb&logoColor=white" alt="MongoDB" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
  <img src="https://img.shields.io/badge/BullMQ-FF5733?style=for-the-badge&logo=bullmq&logoColor=white" alt="BullMQ" />
  <img src="https://img.shields.io/badge/gRPC-244D80?style=for-the-badge&logo=grpc&logoColor=white" alt="gRPC" />
  <img src="https://img.shields.io/badge/Protobuf-E37400?style=for-the-badge&logo=google-cloud&logoColor=white" alt="Protobuf" />
  <img src="https://img.shields.io/badge/JWT-000000?style=for-the-badge&logo=jsonwebtokens&logoColor=white" alt="JWT" />
  <img src="https://img.shields.io/badge/PhonePe-5F259F?style=for-the-badge&logo=phone&logoColor=white" alt="PhonePe" />
</p>

<p align="left">
  <img src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/Axios-5A29E4?style=for-the-badge&logo=axios&logoColor=white" alt="Axios" />
</p>

<p align="left">
  <img src="https://img.shields.io/badge/Flutter-02569B?style=for-the-badge&logo=flutter&logoColor=white" alt="Flutter" />
  <img src="https://img.shields.io/badge/Dart-0175C2?style=for-the-badge&logo=dart&logoColor=white" alt="Dart" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker" />
  <img src="https://img.shields.io/badge/PhonePe_API-5F259F?style=for-the-badge&logo=phone&logoColor=white" alt="PhonePe API" />
  <img src="https://img.shields.io/badge/WebSocket-000000?style=for-the-badge&logo=socketdotio&logoColor=white" alt="WebSocket" />
  <img src="https://img.shields.io/badge/OpenAPI-6BA539?style=for-the-badge&logo=openapiinitiative&logoColor=white" alt="OpenAPI" />
</p>

---

## 🚀 Key Features & Components

### 1. Marketing Landing Page (`/landing-page`)
- Modern, high-performance Next.js landing site configured with Outfit and Inter fonts.
- Features carousel device mockups, a responsive features grid, and a custom **About Us** page detailing the vision of Aibot Ink.

### 2. User & Merchant Portal (`/user-portal`)
- **Hosts (Merchants)**: Apply to host Ordering Tablets or screens at their venue, manage digital food menu items (CRUD), and accept/reject orders in real-time.
- **Advertisers**: Multi-step booking pipeline to target ads at specific States → Cities → Outlets.
- **OTP Verification**: Indian mobile numbers (+91) receive SMS OTPs via the StartMessaging gateway.

### 3. Administrator Console (`/admin-portal`)
- **Dashboard**: Features custom SVG trend graphs for daily revenue projections, donut charts for device split distributions, and quick status metrics.
- **Compact Sidebar**: Lockable, fixed-height sidebar with expandable toggle icons.
- **Moderation Queue**: Plays paid campaigns inside a client-side `video.js` player with details of targeted screens, allowing quick Approve/Reject decisions.
- **Device Provisioning**: Direct tab to register/provision new tabletop tablets or wall displays.
- **Users drilldown**: Inspect host assets or ad bookings.
- **Rates Card CRUD**: Update spot pricing packages (Tablet vs Screens) in real-time.
- **Support Reports**: Review and resolve case tickets submitted by merchants or advertisers.

### 4. Hybrid API Server (`/server`)
- **Fastify HTTP REST endpoints** for web portal users, session tokens, and PhonePe callbacks.
- **Fastify WebSocket endpoints** to stream incoming tabletop orders to restaurant hosts.
- **gRPC Services** (on port `50051`) for Dart client applications on tablets and screens, handling device registration, telemetry logs, and ad impressions.

---

## 🗂️ Folder Structure

```text
d:/AIBotInk/CMS/
├── Logo/                      # Brand assets and graphics (Aibot_Logo.png)
├── Docs/                      # PDFs and workflow guides
├── server/                    # Fastify REST/WebSocket and gRPC Node.js Backend
│   ├── config/                # Environment-segregated configurations (.env.dev, .env.prod)
│   ├── controllers/           # REST and gRPC service logic handlers
│   ├── models/                # MongoDB Mongoose collection models
│   ├── protos/                # gRPC Protocol Buffer interface files
│   ├── routes/                # Endpoint routing mapping
│   ├── services/              # External API integrations (PhonePe, OTP)
│   └── server.js              # Server entry point bootstrapper
├── landing-page/              # Next.js marketing page (port 3000)
├── user-portal/               # Next.js Merchant & Advertiser application (port 3001)
├── admin-portal/              # Next.js Administrator dashboard console (port 3002)
├── tablet-app/                # Flutter Tabletop Kiosk tablet application (Dart)
├── screen-app/                # Flutter Advertising Screen application (Dart)
├── docker-compose.yml         # Local Docker cache (MongoDB & Redis runner)
├── .gitattributes             # Git LF line-ending normalization rules
└── README.md                  # Main developer documentation
```

---

## 🔌 Port Mapping Configuration

| Component | Protocol | Port | Host Address |
| :--- | :--- | :--- | :--- |
| **Landing Page** | HTTP | `3000` | `http://localhost:3000` |
| **User Portal** | HTTP | `3001` | `http://localhost:3001` |
| **Admin Console** | HTTP | `3002` | `http://localhost:3002` |
| **Backend REST & WS** | HTTP | `4200` | `http://localhost:4200` |
| **Backend gRPC** | HTTP/2 | `50051` | `localhost:50051` |

---

## 🛠️ Installation & Getting Started

### 1. Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)
- [Docker & Docker Compose](https://www.docker.com/)
- [Flutter SDK](https://docs.flutter.dev/get-started/install) (only for mobile app builds)

### 2. Automated Run Scripts

Automate database provisioning, dependency setups, and builds using target flags (`-m` / `-M`) with the root deployment helpers.

#### On Windows (PowerShell)
```powershell
# Setup development databases and run local servers
.\deploy.ps1 -m development
# Shorthand: .\deploy.ps1 -M dev

# Build production bundles and compile local assets
.\deploy.ps1 -m production
# Shorthand: .\deploy.ps1 -M prod
```

#### On Linux / macOS (Shell)
```bash
# Make deploy script executable
chmod +x deploy.sh

# Run development servers
./deploy.sh -m development
# Shorthand: ./deploy.sh -M dev

# Build production environment
./deploy.sh -m production
# Shorthand: ./deploy.sh -M prod
```

### 3. Manual Steps

To run individual elements manually:

#### A. Launch Databases
```bash
docker compose up -d
```

#### B. Start Backend Server
```bash
cd server
npm install
npm run dev
```

#### C. Start Frontend Portals
Open separate terminals for each app:
```bash
# Marketing page
cd landing-page && npm install && npm run dev

# Merchant & Advertiser portal
cd user-portal && npm install && npm run dev

# Admin Dashboard console
cd admin-portal && npm install && npm run dev
```

---

## 🛡️ Zero-Hardcoding Policy

No server, portal, database, or API credentials may be hardcoded. 
- All environment-specific variables are imported and exported inside the `config.js` of each package.
- All code modules load environment values solely from the centralized config configuration.
- Local configuration is loaded from `.env.dev` during `npm run dev`, and `.env.prod` during builds.
