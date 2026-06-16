# SMS OTP API Documentation

This document describes the current SMS/OTP authentication system used by GolBot. The project has migrated from **2Factor.in** to **StartMessaging** as the SMS provider.

---

## 1. Provider Overview

| Property | Value |
|---|---|
| **Provider** | [StartMessaging](https://startmessaging.com) |
| **Base URL** | `https://api.startmessaging.com` |
| **Auth Header** | `X-API-Key: <STARTMESSAGING_API_KEY>` |
| **OTP Endpoint** | `POST /otp/send` |
| **Status Endpoint** | `GET /messages/<messageId>` |

### Environment Variables

| Variable | Value | Location |
|---|---|---|
| `STARTMESSAGING_API_KEY` | `sm_live_99e4752f5008b0a34b7b9da01bd77a793614d27a` | `server/.env` |
| `OTP_TEMPLATE_ID` | `0afbdeb0-785d-4dd0-bd48-365a182df276` | `server/.env` |

---

## 2. API Flow

```
┌──────────┐      POST /auth/send-otp       ┌──────────┐
│ Frontend │ ──────────────────────────────> │  Server  │
│          │                                 │          │
│          │ <────────────────────────────── │          │
│          │      { user, sessionId }        │          │
└──────────┘                                 └────┬─────┘
                                                  │
                                          POST /otp/send
                                          X-API-Key: <key>
                                                  │
                                                  v
                                           ┌──────────────┐
                                           │ StartMessaging│
                                           │     API       │
                                           └──────────────┘
```

### Step-by-step

1. **Frontend** sends `POST /api/v1/auth/send-otp` with `{ phone }`.
2. **Server** validates phone (10-digit Indian number, starts with 6-9).
3. **Server** generates a 6-digit OTP and a UUID session ID.
4. **Server** calls `POST https://api.startmessaging.com/otp/send` with the phone, OTP, and template.
5. **Server** saves `OTP`, `sessionId`, and `otpExpiry` (10 min) to MongoDB.
6. **Frontend** sends `POST /api/v1/auth/verify-otp` with `{ phone, otp }`.
7. **Server** looks up the user, checks expiry, and compares OTP using `crypto.timingSafeEqual`.
8. On success, server returns a JWT token.

---

## 3. Server Endpoints

### POST `/api/v1/auth/send-otp`

**Request body:**
```json
{
  "phone": "9876543210"
}
```

**Success response (200):**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "data": {
    "user": { "phone": "9876543210" },
    "sessionId": "a1b2c3d4-...",
    "expiresIn": 600
  }
}
```

> `sessionId` is only returned in `local` environment for debugging.

---

### POST `/api/v1/auth/verify-otp`

**Request body:**
```json
{
  "phone": "9876543210",
  "otp": "123456"
}
```

**Success response (200):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "user": {
      "uid": "64a...",
      "phone": "9876543210"
    },
    "token": "eyJhbGciOi..."
  }
}
```

**Error responses:**
| Status | Message |
|---|---|
| 400 | `Invalid or expired OTP` |
| 400 | `Invalid OTP` |
| 500 | `SMS service not configured` |
| 401 | `Invalid StartMessaging API Key` |
| 402 | `Insufficient Balance for SMS` |
| 429 | `SMS Rate limit exceeded` |

---

## 4. StartMessaging API Details

### Send OTP

```
POST https://api.startmessaging.com/otp/send

Headers:
  X-API-Key: sm_live_99e4752f5008b0a34b7b9da01bd77a793614d27a
  Content-Type: application/json

Body:
{
  "phoneNumber": "+919876543210",
  "templateId": "0afbdeb0-785d-4dd0-bd48-365a182df276",
  "variables": {
    "otp": "123456",
    "appName": "GolBot"
  }
}
```

### Check Message Status

```
GET https://api.startmessaging.com/messages/<messageId>

Headers:
  X-API-Key: sm_live_99e4752f5008b0a34b7b9da01bd77a793614d27a
```

Possible statuses: `initiated`, `queued`, `sent`, `delivered`, `failed`.

---

## 5. Code Reference

| File | Role |
|---|---|
| `server/services/smsService.js` | SMS service abstraction — `sendOTP()` and `checkStatus()` |
| `server/controllers/authController.js` | Auth logic — `phoneSendOtp` and `verifyOtp` handlers |
| `server/models/userModel.js` | User schema with `OTP`, `sessionId`, `otpExpiry`, `isDemo` fields |
| `server/utils/validation.js` | `Validator.validatePhone()` and `Validator.validateOTP()` |
| `server/config/demoConfig.js` | Demo mode bypass (phone `9876543210`, OTP `123456`) |
| `user_web/services/auth.ts` | Frontend `sendOtp()` and `verifyOtp()` functions |

---

## 6. Demo Mode

When `DEMO_MODE=true` (in `.env`), the system bypasses the StartMessaging API entirely:

| Setting | Value |
|---|---|
| `DEMO_PHONE` | `9876543210` |
| `DEMO_OTP` | `123456` |

Demo users are flagged with `isDemo: true` in the database. The JWT includes the `isDemo` claim.

---

## 7. Security Notes

- OTPs are stored as plain strings in MongoDB (the provider generates them server-side).
- Verification uses `crypto.timingSafeEqual` to prevent timing attacks.
- OTP expiry is 10 minutes (`Date.now() + 10 * 60 * 1000`).
- The API key is read from `process.env.STARTMESSAGING_API_KEY` at runtime — never hardcoded in source (only in `.env`).
- Phone numbers are masked in logs (last 4 digits replaced with `****`).
