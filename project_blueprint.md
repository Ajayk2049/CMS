# project_blueprint.md

## 1. Executive Summary
A content‑management platform for two Android devices and control apps:
- **Tabletop ordering tablet** (vertical, kiosk mode, Flutter) – shows full‑screen ads when idle, restaurant menu/ordering when touched.
- **Large advertising screen** (landscape, no touch, Flutter) – runs ads 24/7.

Additional components:
- **Landing page** – marketing site (Next.js).
- **Merchant web portal** – sign‑up/login (OTP), tablet rental, merchant onboarding, overall profile management.
- **Restaurant Owner App** (tablet-optimized web app / Flutter app) – live order requests (accept/reject), payment management & analytics, and menu CRUD (add/edit/remove food items). Note: Restaurant owners **cannot** view or control ads; this is strictly restricted.
- **Advertiser web portal** – sign‑up/login (OTP), location‑based ad booking (state → city → outlet), payment (PhonePe).
- **Admin dashboard** – total control of ads, devices, menus, users, content moderation. Only admins can control the ads playing on the devices.
- **Backend** – hybrid: **gRPC** for device communication, **REST + WebSocket** for web/tablet portals.

## 2. System Architecture (High‑Level)

```
[Flutter Tablet App]    ←→ [Backend gRPC Server]
[Flutter Screen App]    ←→ [Backend gRPC Server]
[Restaurant Owner App]  ←→ [Backend REST API + WebSocket / gRPC]
[Next.js Web Apps]      ←→ [Backend REST API + WebSocket]
```

Backend: Node.js (Fastify + `@grpc/grpc-js`), MongoDB Atlas, Redis (BullMQ), Docker on VPS.

## 3. Protocol Strategy

| Layer | Protocol | Reason |
|-------|----------|--------|
| Flutter apps ↔ Backend | gRPC (Protobuf) | Efficient binary, streaming, code generation for Dart & Node.js |
| Web portals ↔ Backend | REST (JSON) + WebSocket (only for merchant live orders) | Browser native, easier debugging |

## 4. Detailed Component Design

### 4.1 Landing Page
- Next.js + Tailwind + shadcn
- Sections: Hero, Features, Location Map, Reviews, Device Demo, Sample Ad, About Us, CTA for Merchants / Advertisers.
- **Skills**: `seo`, `landing-page-generator`, `frontend-design`, `ui-ux-pro-max`, `copywriting`

### 4.2 Merchant Web Portal (Hosts)

#### Registration & Login
- **OTP‑based registration** (mandatory). Flow:
  1. User enters **mobile number** (with country code dropdown; default +91 for India).
  2. Backend validates number (Indian mobile starting 6,7,8,9 after +91). If country code is not +91, show message: “International OTP coming soon – please choose Indian number for now” (or disable registration for non‑Indian numbers for now).
  3. User receives 6‑digit OTP via SMS (refer to `sms_api.md` in project root for integration).
  4. User enters OTP and a password to complete registration.
  5. JWT issued.
- **Login**: mobile number + password only (no OTP required after registration).
- **Skills**: `auth-implementation-patterns`, `react-best-practices`, `shadcn`, `frontend-security-coder`

#### Host Application (after login)
- Form to apply for hosting a device, containing:
  1. **Outlet name**
  2. **Outlet description**
  3. **Door/Shop No**
  4. **Street/Location**
  5. **City/Town**
  6. **State/Province**
  7. **ZIP Code**
  8. **Contact Person**
  9. **Phone**
  10. **Email**
  11. **Device type** (dropdown: tablet / screen)
  12. **Quantity**
- Submitted data stored in `HostApplication` collection; admin reviews and approves. Once approved, merchant account gains access to dashboard.
- **Skills**: `react-best-practices`, `api-patterns`

#### Dashboard (approved merchants)
- Menu Management, Orders, Payments (PhonePe), Tablet Rental Status.
- **PhonePe integration**: Implemented using `phone_pe_implementation.md` from project root. All customer payments (for food orders) flow through PhonePe.
- **Skills**: `phone-pe-integration` (use custom instructions from the .md file), `stripe-integration` (not needed, but we can refer to `payment-integration` skill), `ui-ux-designer`

### 4.3 Advertiser Web Portal

#### Registration/Login – same OTP flow as merchant (using `sms_api.md`). Country code validation similar.

#### Booking Flow (after login)
- Advertiser wants to place an ad. Flow:
  1. **Select State** (dropdown populated from `HostApplication` approved outlets)
  2. **Select City/Town** (filtered by state)
  3. **Select Outlet** (specific host, device type)
  4. **Fill ad details**:
     - Description
     - Shop/Door No (auto‑populated from host info)
     - Street/Location (auto)
     - Device name (auto)
     - Quantity (how many screens/tablets of that host)
     - **Ad duration** (dropdown, values from `Ads_Rates` collection)
     - **Frequency** (dropdown, e.g., every hour, continuous, etc.)
     - **Amount** (auto‑calculated based on selection, fetched from `Ads_Rates` table)
  5. Submit → payment via **PhonePe** (see `phone_pe_implementation.md`).
  6. After successful payment, ad enters **pending approval** queue in admin panel.
- **Skills**: `react-best-practices`, `shadcn`, `api-patterns`, `phone-pe-integration`, `kpi-dashboard-design`

### 4.4 Admin Dashboard
- View/approve/reject host applications and ad submissions.
- Manage `Ads_Rates` (add/update pricing plans for duration, frequency, device type).
- Full device, menu, user management as before.
- **Skills**: `react-best-practices`, `shadcn`, `kpi-dashboard-design`, `ui-ux-designer`, `security-auditor`

### 4.5 Flutter Tablet App (Tabletop Ordering)
- Kiosk mode, vertical ad playback, touch‑to‑show‑menu.
- gRPC client (Dart generated) for `OrderService`, `DeviceService`, `MenuService`.
- Payment handled via backend (PhonePe); tablet shows QR or redirects.
- Ad tracking: impressions and interactive button clicks.
- **Skills**: `flutter-expert`, `mobile-developer`, `mobile-security-coder`

### 4.6 Flutter Screen App
- Landscape full‑screen ad player, gRPC client.
- Local caching, emergency ad streaming.
- QR code overlay for engagement measurement.
- **Skills**: `flutter-expert`, `mobile-developer`

### 4.7 Backend
- Fastify + gRPC, MongoDB, BullMQ.
- OTP service: integrate SMS provider as per `sms_api.md` (likely third‑party API).
- PhonePe integration: follow `phone_pe_implementation.md` exactly for payment flows, callbacks, reconciliation.
- `Ads_Rates` collection to define pricing for ad slots.
- Country code & mobile validation middleware.
- Security: rate limiting, JWT, RBAC, idempotency on payments/orders.
- **Skills**: `nodejs-best-practices`, `api-security-best-practices`, `backend-security-coder`, `bullmq-specialist`, `nosql-expert`, `payment-integration`, `api-patterns`

### 4.8 Restaurant Owner App
- **Goal**: Provide a tablet-friendly, real-time control interface for restaurant owners and staff.
- **Features**:
  - **Live Order Notifications**: Visual and audible alerts for incoming customer orders. Accept/reject flow.
  - **Payment Analytics & History**: Analyze incoming payments, total revenue, and track order payouts.
  - **Menu Management (CRUD)**: Add, edit, and remove food items (pricing, availability, categories, and descriptions).
  - **Restricted Access**: Absolutely no control over the ads shown on the tabletop tablets or screens. Advertising space is centrally managed by the platform Admin.
- **Skills**: `react-best-practices`, `shadcn`, `websocket-client`, `ui-ux-designer`

## 5. Database Schema Additions
- **HostApplication**: all fields from 4.2 (outlet info), status (pending/approved/rejected), userId.
- **Ads_Rates**: rateId, deviceType, duration (e.g., 7 days, 30 days), frequency (e.g., every hour, continuous), amount.
- **AdBooking**: fields from 4.3 flow + payment details (transactionId, status).
- **OTP**: temporary collection for verification codes, attempts, expiry.
- **PhonePeTransactions**: store transaction details, status callbacks.

## 6. Mobile Number Validation & Country Code
- Frontend: dropdown of country codes (with flag) fetched from a static JSON list. Default selection: India (+91). On change, if +91, validate 10‑digit mobile starting with 6‑9. If not +91, show notice and disable send OTP (or block registration for now).
- Backend: enforce same validation, and only send SMS for Indian numbers (as per `sms_api.md` might have limited coverage). Return clear error for unsupported countries.
- This logic ensures future‑proof extension without breaking UX.

## 7. Payment Flow (PhonePe)
- For advertisers: after selecting ad slot, backend creates an order, initiates PhonePe payment. Frontend redirects to PhonePe checkout page. On success, PhonePe hits webhook → backend updates AdBooking status → ad moves to pending approval.
- For merchants (tablet ordering): when customer pays for food, backend generates PhonePe QR/payment link; tablet shows it. Webhook confirms payment → order status updated.
- All payment communications follow the guide in `phone_pe_implementation.md`. Zero hardcoding of merchant IDs, salts, keys—all from `config.js`.

## 8. Ad Interaction Measurement (unchanged)
- Tablet: duration + interactive button click.
- Screen: overlay QR code per ad; scan tracked as click.

## 9. Development Phases & Skill Mapping

| Phase | Tasks | Skills to Apply |
|-------|-------|-----------------|
| **1. Planning** | Schemas, proto files, API contracts | `architecture`, `api-patterns`, `database-design`, `c4-architecture` |
| **2. Backend Core** | Fastify+gRPC, config, MongoDB, auth (OTP, country validation) | `nodejs-best-practices`, `nodejs-backend-patterns`, `nosql-expert`, `auth-implementation-patterns` |
| **3. Backend Features** | SMS OTP integration, PhonePe, Ads_Rates, booking logic, device services, BullMQ | `bullmq-specialist`, `api-security-best-practices`, `payment-integration`, also manually consult `sms_api.md` and `phone_pe_implementation.md` |
| **4. Frontend Landing** | Next.js, Tailwind, shadcn | `seo`, `landing-page-generator`, `frontend-design` |
| **5. Frontend Portals** | Merchant & Advertiser dashboards, country dropdown, multi‑step ad booking, Admin panel, and **Restaurant Owner App** interface | `react-best-practices`, `shadcn`, `redux` (`react-state-management`), `kpi-dashboard-design`, `ui-ux-designer`, `frontend-security-coder` |
| **6. Flutter Tablet** | gRPC client, kiosk, ad player, menu, ordering | `flutter-expert`, `mobile-developer`, `mobile-security-coder` |
| **7. Flutter Screen** | Ad player, gRPC client | `flutter-expert`, `mobile-developer` |
| **8. Integration & Test** | E2E, security audit | `e2e-testing`, `api-security-testing`, `security-auditor` |
| **9. Deployment** | Docker, CI/CD, VPS | `docker-expert`, `deployment-pipeline-design`, `cicd-automation-workflow-automate` |
| **10. Docs** | README, API docs | `code-documentation`, `api-documentation` |

**AI Agent Instructions:**  
- Before each phase, navigate to `C:\Users\Ajay\.agents\skills\<skill-name>\SKILL.md` and follow the instructions exactly.  
- For SMS and PhonePe, also read the provided `.md` files in the project root.  
- Ensure **zero‑hardcoding** – every env‑specific value goes through `config.js`.  
- Maintain `progress.md` and `task.md` as per Rules.md.

## 10. Risk Mitigation
- **Offline tablets**: grey out UI when gRPC lost.
- **Video transcoding**: BullMQ + FFmpeg worker.
- **Payment disputes**: idempotency keys + thorough logging.
- **International OTP future**: code structure already supports country code; just enable SMS provider when ready.

---

