# PhonePe Payments — Comprehensive Integration Guide

This guide covers the complete PhonePe payment integration lifecycle: authentication, payment initiation, status checking, webhook handling, and refunds. It supports both **Standard V1 (X-VERIFY)** and **Enterprise V2 (OAuth)** flows.

---

## 1. Authentication Methods

PhonePe offers two authentication mechanisms. Confirm which one your merchant account supports before integrating.

### 1.1 Standard / PG Checkout (V1)

- **Header:** `X-VERIFY`
- **Mechanism:** Salt Key + Salt Index
- **Payload:** Base64-encoded JSON wrapped in a `request` object.

#### Checksum Formula

```
SHA256(base64Payload + endpoint + saltKey) + "###" + saltIndex
```

#### Checksum Utility (Node.js)

```javascript
const crypto = require('crypto');

function generateV1Checksum(payload, endpoint, saltKey, saltIndex) {
  const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
  const stringToHash = base64Payload + endpoint + saltKey;
  const sha256 = crypto.createHash('sha256').update(stringToHash).digest('hex');
  return { base64Payload, checksum: `${sha256}###${saltIndex}` };
}
```

#### Checksum for GET Requests (No Body)

For status-check GET endpoints, there is no base64 payload. The checksum is computed directly from the endpoint path:

```
SHA256(endpointPath + saltKey) + "###" + saltIndex
```

### 1.2 Enterprise Checkout (V2)

- **Header:** `Authorization: O-Bearer <Token>`
- **Mechanism:** OAuth 2.0 Client Credentials (Client ID + Client Secret)
- **Payload:** Raw JSON (no Base64 wrapping).

#### Token Management (with Caching)

```javascript
async function getAuthToken(config) {
  if (cache.token && cache.expiresAt > Date.now()) return cache.token;

  const response = await axios.post(`${config.authUrl}/v1/oauth/token`, {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'client_credentials'
  });

  cache.token = response.data.access_token;
  cache.expiresAt = Date.now() + (response.data.expires_in * 1000);

  return cache.token;
}
```

---

## 2. Environment URLs

| Context | V1 (Standard) | V2 (Enterprise) |
|---|---|---|
| **Sandbox / UAT** | `https://api-preprod.phonepe.com/apis/hermes` | `https://mercury-uat.phonepe.com` |
| **Production** | `https://api.phonepe.com/apis/hermes` | `https://mercury.phonepe.com` |

### Endpoint Reference

| Action | Method | V1 Endpoint | V2/Enterprise Endpoint |
|---|---|---|---|
| Initiate Payment | POST | `/pg/v1/pay` | `/v3/credit/backToSource` |
| Check Payment Status | GET | `/pg/v1/status/{merchantId}/{transactionId}` | `/v3/transaction/{merchantId}/{transactionId}/status` |
| Initiate Refund | POST | `/v3/credit/backToSource` | `/v2/refund` |
| Check Refund Status | GET | Use Check Payment Status API with refund `transactionId` | Use Check Payment Status API with refund `transactionId` |

---

## 3. Payment Flow

### 3.1 Initiation

- Always generate a **unique `merchantTransactionId`** for every request.
- **Tip:** Prefix IDs with project codes (e.g., `VND_`, `GLB_`) to avoid collisions if sharing a merchant account across multiple projects.
- Include required fields: `merchantId`, `transactionId`, `amount` (in **paise**), `merchantOrderId`, `message`.

### 3.2 Handling `PAYMENT_PENDING`

A response of `PAYMENT_PENDING` is common and **does not mean failure**.

- **Do not retry** the initiate call for the same transaction — this causes `DUPLICATE_TXN_REQUEST` or `EXCESS_REFUND_AMOUNT` errors.
- **Mandatory:** Implement a polling mechanism using the **Check Payment Status API**.
- **Recommended polling:** Every 20–30 seconds, up to a maximum of 90 seconds (PhonePe's resolution window).

### 3.3 Check Payment Status API

Used to fetch real-time status of any transaction (payment or refund).

#### Request

| Field | Value |
|---|---|
| **HTTP Method** | `GET` |
| **V1 Header** | `X-VERIFY`: `SHA256(endpointPath + saltKey) + "###" + saltIndex` |
| **V2 Header** | `Authorization: O-Bearer <Token>` |

#### Path Parameters

| Parameter | Type | Required | Description |
|---|---|---|---|
| `merchantId` | String | Yes | Unique Merchant ID assigned by PhonePe |
| `transactionId` | String | Yes | Merchant transaction ID (payment or refund) |

#### Response Parameters

| Parameter | Type | Description |
|---|---|---|
| `success` | Boolean | Whether the request was processed |
| `code` | Enum | Response code (see Section 5) |
| `paymentState` | Enum | `COMPLETED`, `FAILED`, `PENDING` |
| `amount` | Long | Transaction amount in paise — **cross-check with your database** |

---

## 4. Webhooks

Webhooks are the final source of truth for transaction status.

- **V1:** The webhook payload includes an `X-VERIFY` checksum. Recompute and compare to verify authenticity.
- **V2:** Verify using Basic Auth or the provided signature header.
- Always validate webhook payloads before updating your database.

---

## 5. Refund Flow

Refunds follow a mandatory **two-step** process:

1. **Initiate** — Call the Refund API (`POST`).
2. **Verify** — Poll the Check Payment Status API using the **refund `transactionId`** (not the original payment ID).

### 5.1 Initiate Refund

| Field | Value |
|---|---|
| **HTTP Method** | `POST` |
| **UAT Endpoint** | `https://mercury-uat.phonepe.com/enterprise-sandbox/v3/credit/backToSource` |
| **Production Endpoint** | `https://mercury-t2.phonepe.com/v3/credit/backToSource` |

#### Request Headers

| Header | Description |
|---|---|
| `Content-Type` | `application/json` |
| `X-VERIFY` | `SHA256(base64Payload + "/v3/credit/backToSource" + saltKey) + "###" + saltIndex` |
| `X-PROVIDER-ID` | Required if onboarded via a Provider |
| `X-CALLBACK-URL` | Webhook callback URL for automated status updates |

#### Request Parameters (JSON Payload — Base64 encoded for V1)

| Parameter | Type | Required | Description |
|---|---|---|---|
| `merchantId` | String | Yes | Unique Merchant ID assigned by PhonePe |
| `transactionId` | String | Yes | Unique ID to track the refund request. **Must differ from the original payment transaction ID.** |
| `originalTransactionId` | String | Yes* | Merchant transaction ID of the original payment *(use this OR `providerReferenceId`)* |
| `providerReferenceId` | String | Yes* | PhonePe transaction ID of the original payment *(use this OR `originalTransactionId`)* |
| `amount` | Long | Yes | Refund amount in **paise**. Cannot exceed the original payment amount. |
| `merchantOrderId` | String | Yes | Order ID for this merchant transaction |
| `subMerchant` | String | No | Tag to categorize the merchant transaction |
| `message` | String | Yes | Short message explaining the refund reason |

### 5.2 Refund Status Checking

Use the **same Check Payment Status API** (Section 3.3) with the **refund `transactionId`** (not the original payment `transactionId`).

#### Refund-Specific Response Parameters

| Parameter | Type | Description |
|---|---|---|
| `success` | Boolean | Whether the request was processed |
| `code` | Enum | Response code |
| `paymentState` | Enum | `COMPLETED`, `FAILED`, `PENDING` |
| `amount` | Long | Refund amount in paise — cross-check with your DB |

### 5.3 Refund Integration Strategy

1. **Initiate Refund** — Call the Refund API (`POST`).
2. **Evaluate Immediate Response:**
   - `PAYMENT_SUCCESS` → Mark refund as completed in your database.
   - `PAYMENT_ERROR` → Mark refund as failed.
   - `PAYMENT_PENDING` → Leave status as pending and start polling.
3. **Poll via Check Status API:**
   - Wait 20 seconds, check status.
   - If still `PAYMENT_PENDING`, wait another 20 seconds and check again.
   - Repeat until `PAYMENT_SUCCESS` / `PAYMENT_ERROR`, or until the 90-second window elapses.

### 5.4 Critical Refund Rules

| Rule | Consequence of Violation |
|---|---|
| Do **not** retry the Refund API on `PAYMENT_PENDING` | `PAYMENT_ERROR` with code `EXCESS_REFUND_AMOUNT` |
| The `transactionId` for a refund **must** be different from the original payment ID | `DUPLICATE_TXN_REQUEST` |
| Always poll for status after `PAYMENT_PENDING` | Refund status will remain unknown |
| Amount must not exceed the original payment amount | `EXCESS_REFUND_AMOUNT` |

---

## 6. Response Codes Reference

### 6.1 Refund API Response Codes

| Code | Meaning | Action |
|---|---|---|
| `BAD_REQUEST` | Invalid request format | Fix payload and retry |
| `AUTHORIZATION_FAILED` | Incorrect `X-VERIFY` header | Verify checksum generation logic |
| `TRANSACTION_NOT_FOUND` | Original payment transaction not found | Validate `originalTransactionId` / `providerReferenceId` |
| `PAYMENT_SUCCESS` | Refund successful | Mark as complete in DB |
| `PAYMENT_ERROR` | Refund failed | Mark as failed in DB |
| `PAYMENT_PENDING` | Refund in progress | Start polling via Check Status API |
| `DUPLICATE_TXN_REQUEST` | `transactionId` already used | Generate a new unique `transactionId` and retry |
| `EXCESS_REFUND_AMOUNT` | Amount exceeds original payment, or refund already processed | Do not retry; investigate transaction history |

### 6.2 Check Status API Response Codes

| Code | Meaning | Action |
|---|---|---|
| `TRANSACTION_NOT_FOUND` | Transaction not initiated in PhonePe | Verify `transactionId` and `merchantId` |
| `BAD_REQUEST` | Invalid request format | Fix request parameters |
| `AUTHORIZATION_FAILED` | Incorrect `X-VERIFY` header | Verify checksum logic |
| `INTERNAL_SERVER_ERROR` | PhonePe server error | Retry after a delay |
| `PAYMENT_SUCCESS` | Transaction successful | Update DB to completed |
| `PAYMENT_ERROR` | Transaction failed | Update DB to failed |
| `PAYMENT_PENDING` | Transaction still in progress | Continue polling |

---

## 7. Best Practices

1. **Always poll for `PAYMENT_PENDING`** — Never assume failure; PhonePe resolves within 90 seconds.
2. **Unique transaction IDs** — Prefix IDs with project/environment codes to prevent collisions.
3. **Webhook verification** — Always validate checksums/signatures before trusting webhook data.
4. **Cross-check amounts** — Always compare the `amount` field in responses with your database records.
5. **Token caching (V2)** — Cache OAuth tokens with a buffer before expiry to minimize API calls.
6. **Idempotency** — Design your system so duplicate webhook deliveries do not cause duplicate processing.
7. **Environment isolation** — Use separate merchant accounts for sandbox and production.