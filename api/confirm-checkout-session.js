import crypto from "crypto";

const MAX_GOLDEN_TICKETS = 99;
const DEFAULT_FIREBASE_PROJECT_ID = "monday-cup";
const FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const TOKEN_CLOCK_SKEW_SECONDS = 300;
const STRIPE_API_VERSION = "2024-06-20";

const STORE_ITEM_IDS = {
  allTeams: "allTeams",
  goldenBall: "goldenBall",
  goldenBoot: "goldenBoot",
  goldenGlove: "goldenGlove",
  goldenTicket: "goldenTicket",
  fullBundle: "fullBundle",
};

let cachedFirebaseCerts = null;
let cachedFirebaseCertsExpiry = 0;
let cachedGoogleAccessToken = null;
let cachedGoogleAccessTokenExpiry = 0;

function env(name, fallbackName = "") {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : "") || "";
}

function json(res, status, payload) {
  res.setHeader("Content-Type", "application/json");
  return res.status(status).json(payload);
}

function getFirebaseProjectId() {
  return (
    env("FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID") ||
    env("GOOGLE_CLOUD_PROJECT") ||
    env("GCLOUD_PROJECT") ||
    DEFAULT_FIREBASE_PROJECT_ID
  );
}

function safeQuantity(value, { min = 0, max = 1 } = {}) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function getBearerToken(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  return String(header).startsWith("Bearer ") ? String(header).slice(7).trim() : "";
}

function base64UrlToBuffer(value = "") {
  const normalised = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalised.padEnd(normalised.length + ((4 - (normalised.length % 4)) % 4), "=");
  return Buffer.from(padded, "base64");
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function decodeJwtPart(value = "") {
  return JSON.parse(base64UrlToBuffer(value).toString("utf8"));
}

function getCacheMaxAgeSeconds(cacheControl = "") {
  const match = String(cacheControl || "").match(/max-age=(\d+)/i);
  const maxAge = match ? Number(match[1]) : 0;
  return Number.isFinite(maxAge) && maxAge > 0 ? maxAge : 3600;
}

async function getFirebasePublicCerts() {
  const now = Date.now();
  if (cachedFirebaseCerts && cachedFirebaseCertsExpiry > now + 60000) return cachedFirebaseCerts;

  const response = await fetch(FIREBASE_CERTS_URL);
  const certs = await response.json().catch(() => ({}));

  if (!response.ok || !certs || typeof certs !== "object") {
    const error = new Error("Could not fetch Firebase public certificates");
    error.code = "firebase_auth_unavailable";
    throw error;
  }

  cachedFirebaseCerts = certs;
  cachedFirebaseCertsExpiry = now + getCacheMaxAgeSeconds(response.headers.get("cache-control")) * 1000;
  return cachedFirebaseCerts;
}

async function verifyFirebaseUserFromBearer(req) {
  const token = getBearerToken(req);
  const segments = token.split(".");

  if (!token || segments.length !== 3) {
    const error = new Error("Missing Firebase ID token");
    error.code = "firebase_auth_invalid";
    throw error;
  }

  const [headerPart, payloadPart, signaturePart] = segments;
  let header;
  let payload;

  try {
    header = decodeJwtPart(headerPart);
    payload = decodeJwtPart(payloadPart);
  } catch {
    const error = new Error("Invalid Firebase ID token format");
    error.code = "firebase_auth_invalid";
    throw error;
  }

  if (header?.alg !== "RS256" || !header?.kid) {
    const error = new Error("Invalid Firebase ID token header");
    error.code = "firebase_auth_invalid";
    throw error;
  }

  const projectId = getFirebaseProjectId();
  const nowSeconds = Math.floor(Date.now() / 1000);
  const expectedIssuer = `https://securetoken.google.com/${projectId}`;
  const uid = typeof payload?.sub === "string" ? payload.sub : "";

  if (payload?.aud !== projectId || payload?.iss !== expectedIssuer) {
    const error = new Error("Firebase ID token was issued for a different project");
    error.code = "firebase_auth_invalid";
    throw error;
  }

  if (!uid || uid.length > 128) {
    const error = new Error("Firebase ID token does not contain a valid user id");
    error.code = "firebase_auth_invalid";
    throw error;
  }

  if (!Number.isFinite(Number(payload?.exp)) || Number(payload.exp) <= nowSeconds) {
    const error = new Error("Firebase ID token has expired");
    error.code = "firebase_auth_invalid";
    throw error;
  }

  if (Number.isFinite(Number(payload?.iat)) && Number(payload.iat) > nowSeconds + TOKEN_CLOCK_SKEW_SECONDS) {
    const error = new Error("Firebase ID token issue time is invalid");
    error.code = "firebase_auth_invalid";
    throw error;
  }

  const certs = await getFirebasePublicCerts();
  const certificate = certs[header.kid];
  if (!certificate) {
    const error = new Error("Firebase ID token certificate is unavailable");
    error.code = "firebase_auth_unavailable";
    throw error;
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();

  const verified = verifier.verify(certificate, base64UrlToBuffer(signaturePart));
  if (!verified) {
    const error = new Error("Firebase ID token signature verification failed");
    error.code = "firebase_auth_invalid";
    throw error;
  }

  return {
    uid,
    email: typeof payload?.email === "string" ? payload.email : "",
    emailVerified: Boolean(payload?.email_verified),
  };
}

async function readJsonBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string") {
    try {
      return JSON.parse(req.body || "{}");
    } catch {
      return {};
    }
  }

  return await new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function normalisePrivateKey(value = "") {
  return String(value || "").replace(/\\n/g, "\n");
}

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedGoogleAccessToken && cachedGoogleAccessTokenExpiry > now + 60) return cachedGoogleAccessToken;

  const clientEmail = env("FIREBASE_CLIENT_EMAIL");
  const privateKey = normalisePrivateKey(env("FIREBASE_PRIVATE_KEY"));
  if (!clientEmail || !privateKey) throw new Error("Firebase service account credentials are not configured");

  const iat = now;
  const exp = iat + 3600;
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat,
    exp,
  }));
  const unsignedJwt = `${header}.${claimSet}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsignedJwt), privateKey)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const jwt = `${unsignedJwt}.${signature}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) {
    throw new Error(payload?.error_description || payload?.error || "Could not authenticate Firebase service account");
  }

  cachedGoogleAccessToken = payload.access_token;
  cachedGoogleAccessTokenExpiry = now + Number(payload.expires_in || 3600);
  return cachedGoogleAccessToken;
}

function firestoreDocumentName(projectId, ...segments) {
  const encoded = segments.map((segment) => encodeURIComponent(String(segment)));
  return `projects/${projectId}/databases/(default)/documents/${encoded.join("/")}`;
}

function firestoreValue(value) {
  if (value === null || value === undefined) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === "number") return { doubleValue: value };
  if (typeof value === "string") return { stringValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: firestoreFields(value) } };
  return { stringValue: String(value) };
}

function firestoreFields(source = {}) {
  return Object.fromEntries(Object.entries(source).map(([key, value]) => [key, firestoreValue(value)]));
}

function firestoreBoolValue(value, fallback = false) {
  return typeof value?.booleanValue === "boolean" ? value.booleanValue : fallback;
}

function firestoreIntValue(value, fallback = 0) {
  const raw = value?.integerValue ?? value?.doubleValue;
  const number = Number(raw);
  return Number.isFinite(number) ? Math.floor(number) : fallback;
}

function firestoreMapFields(value) {
  return value?.mapValue?.fields || {};
}

async function firestoreGetDocument(accessToken, projectId, ...segments) {
  const name = firestoreDocumentName(projectId, ...segments);
  const response = await fetch(`https://firestore.googleapis.com/v1/${name}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "Could not read Firestore user document");
  return payload;
}

function readCurrentEntitlements(userDoc = {}) {
  const fields = userDoc.fields || {};
  const upgrades = firestoreMapFields(fields.upgradesPurchased);
  const unlocks = firestoreMapFields(fields.unlocks);
  const consumables = firestoreMapFields(fields.consumables);
  const ticket = firestoreMapFields(consumables.goldenTicket);

  return {
    allTeams: Boolean(
      firestoreBoolValue(upgrades.allTeams) ||
        firestoreBoolValue(unlocks.allTeams) ||
        firestoreBoolValue(fields.allTeamsEquipped) ||
        firestoreBoolValue(fields.allTeamsUnlocked)
    ),
    goldenBoot: firestoreBoolValue(upgrades.goldenBoot),
    goldenBall: firestoreBoolValue(upgrades.goldenBall),
    goldenGlove: firestoreBoolValue(upgrades.goldenGlove),
    goldenTicketQty: safeQuantity(firestoreIntValue(ticket.quantity, 0), { min: 0, max: MAX_GOLDEN_TICKETS }),
    goldenTicketTotalPurchased: Math.max(0, firestoreIntValue(ticket.totalPurchased, 0)),
  };
}

function parseSelectedItems(value = "") {
  const grants = {
    allTeams: false,
    goldenBoot: false,
    goldenBall: false,
    goldenGlove: false,
    goldenTicketQty: 0,
    rawItems: [],
  };

  String(value || "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .forEach((part) => {
      const [rawId, rawQty] = part.split(":");
      const itemId = String(rawId || "").trim();
      const quantity = safeQuantity(rawQty, {
        min: 0,
        max: itemId === STORE_ITEM_IDS.goldenTicket ? MAX_GOLDEN_TICKETS : 1,
      });
      if (!itemId || !quantity) return;

      grants.rawItems.push({ itemId, quantity });

      if (itemId === STORE_ITEM_IDS.fullBundle) {
        grants.allTeams = true;
        grants.goldenBoot = true;
        grants.goldenBall = true;
        grants.goldenGlove = true;
        grants.goldenTicketQty += quantity;
        return;
      }

      if (itemId === STORE_ITEM_IDS.allTeams) grants.allTeams = true;
      if (itemId === STORE_ITEM_IDS.goldenBoot) grants.goldenBoot = true;
      if (itemId === STORE_ITEM_IDS.goldenBall) grants.goldenBall = true;
      if (itemId === STORE_ITEM_IDS.goldenGlove) grants.goldenGlove = true;
      if (itemId === STORE_ITEM_IDS.goldenTicket) grants.goldenTicketQty += quantity;
    });

  grants.goldenTicketQty = safeQuantity(grants.goldenTicketQty, { min: 0, max: MAX_GOLDEN_TICKETS });
  return grants;
}

function isPaidCheckoutSession(session = {}) {
  if (session.mode !== "payment") return false;
  return session.payment_status === "paid" || session.payment_status === "no_payment_required";
}

function buildUserEntitlementUpdate({ current, grants, session, timestamp }) {
  const addTickets = safeQuantity(grants.goldenTicketQty, { min: 0, max: MAX_GOLDEN_TICKETS });
  const nextTicketQty = safeQuantity(current.goldenTicketQty + addTickets, { min: 0, max: MAX_GOLDEN_TICKETS });
  const actuallyAddedTickets = Math.max(0, nextTicketQty - current.goldenTicketQty);
  const nextTotalPurchased = current.goldenTicketTotalPurchased + actuallyAddedTickets;
  const hasTickets = nextTicketQty > 0;

  const update = {
    updatedAt: timestamp,
    lastPurchase: {
      provider: "stripe",
      checkoutSessionId: session.id,
      paymentIntentId: String(session.payment_intent || ""),
      purchasedAt: timestamp,
      selectedItems: grants.rawItems,
    },
    payments: {
      stripe: {
        lastCheckoutSessionId: session.id,
        lastPaymentIntentId: String(session.payment_intent || ""),
        lastPurchaseAt: timestamp,
      },
    },
  };

  const updateMask = ["updatedAt", "lastPurchase", "payments.stripe"];

  if (grants.allTeams) {
    update.upgradesPurchased = { ...(update.upgradesPurchased || {}), allTeams: true };
    updateMask.push("upgradesPurchased.allTeams");
  }

  if (grants.goldenBoot || grants.goldenBall || grants.goldenGlove) {
    update.upgradesPurchased = {
      ...(update.upgradesPurchased || {}),
      ...(grants.goldenBoot ? { goldenBoot: true } : {}),
      ...(grants.goldenBall ? { goldenBall: true } : {}),
      ...(grants.goldenGlove ? { goldenGlove: true } : {}),
    };
    if (grants.goldenBoot) updateMask.push("upgradesPurchased.goldenBoot");
    if (grants.goldenBall) updateMask.push("upgradesPurchased.goldenBall");
    if (grants.goldenGlove) updateMask.push("upgradesPurchased.goldenGlove");
  }

  if (addTickets > 0) {
    update.consumables = {
      goldenTicket: {
        quantity: nextTicketQty,
        totalPurchased: nextTotalPurchased,
        lastPurchasedAt: timestamp,
      },
    };
    update.cosmeticsEquipped = { goldenTicket: hasTickets };
    updateMask.push(
      "consumables.goldenTicket.quantity",
      "consumables.goldenTicket.totalPurchased",
      "consumables.goldenTicket.lastPurchasedAt",
      "cosmeticsEquipped.goldenTicket",
    );
  }

  return { update, updateMask };
}

async function firestoreCommit(accessToken, projectId, writes) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:commit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ writes }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error?.message || "Could not commit Firestore purchase update";
    const code = payload?.error?.status || payload?.error?.code || "";
    const error = new Error(message);
    error.firestoreCode = code;
    throw error;
  }
  return payload;
}

async function retrieveStripeCheckoutSession(sessionId) {
  const stripeSecretKey = env("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) throw new Error("Stripe secret key is not configured");

  const response = await fetch(`https://api.stripe.com/v1/checkout/sessions/${encodeURIComponent(sessionId)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${stripeSecretKey}`,
      "Stripe-Version": STRIPE_API_VERSION,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || "Could not retrieve Stripe checkout session");
  return payload;
}

function buildIdempotentEntitlementRepairUpdate(grants = {}, timestamp) {
  const update = { updatedAt: timestamp };
  const updateMask = ["updatedAt"];

  if (grants.allTeams) {
    update.upgradesPurchased = { ...(update.upgradesPurchased || {}), allTeams: true };
    updateMask.push("upgradesPurchased.allTeams");
  }

  if (grants.goldenBoot || grants.goldenBall || grants.goldenGlove) {
    update.upgradesPurchased = {
      ...(update.upgradesPurchased || {}),
      ...(grants.goldenBoot ? { goldenBoot: true } : {}),
      ...(grants.goldenBall ? { goldenBall: true } : {}),
      ...(grants.goldenGlove ? { goldenGlove: true } : {}),
    };
    if (grants.goldenBoot) updateMask.push("upgradesPurchased.goldenBoot");
    if (grants.goldenBall) updateMask.push("upgradesPurchased.goldenBall");
    if (grants.goldenGlove) updateMask.push("upgradesPurchased.goldenGlove");
  }

  return { update, updateMask };
}

async function repairNonConsumableEntitlements(accessToken, projectId, firebaseUid, grants, timestamp) {
  const { update, updateMask } = buildIdempotentEntitlementRepairUpdate(grants, timestamp);
  if (updateMask.length <= 1) return false;

  await firestoreCommit(accessToken, projectId, [
    {
      update: {
        name: firestoreDocumentName(projectId, "users", firebaseUid),
        fields: firestoreFields(update),
      },
      updateMask: { fieldPaths: updateMask },
    },
  ]);

  return true;
}

async function applyCheckoutSessionToFirebase(session) {
  const projectId = getFirebaseProjectId();
  if (!projectId) throw new Error("FIREBASE_PROJECT_ID is not configured");

  const firebaseUid = String(session.client_reference_id || session.metadata?.firebaseUid || "").slice(0, 128);
  if (!firebaseUid) throw new Error("Checkout session is missing firebaseUid/client_reference_id");

  const selectedItems = String(session.metadata?.selectedItems || "");
  const grants = parseSelectedItems(selectedItems);
  if (!grants.rawItems.length) throw new Error("Checkout session has no selected item metadata");

  const timestamp = new Date().toISOString();
  const accessToken = await getGoogleAccessToken();
  const userDoc = await firestoreGetDocument(accessToken, projectId, "users", firebaseUid);
  const current = readCurrentEntitlements(userDoc || {});
  const { update, updateMask } = buildUserEntitlementUpdate({ current, grants, session, timestamp });

  const userDocumentName = firestoreDocumentName(projectId, "users", firebaseUid);
  const eventDocumentName = firestoreDocumentName(projectId, "users", firebaseUid, "stripeEvents", session.id);

  try {
    await firestoreCommit(accessToken, projectId, [
      {
        update: {
          name: eventDocumentName,
          fields: firestoreFields({
            provider: "stripe",
            type: "checkout.session.completed",
            source: "return-confirmation",
            stripeEventProcessedAt: timestamp,
            checkoutSessionId: session.id,
            paymentIntentId: String(session.payment_intent || ""),
            firebaseUid,
            selectedItems,
            amountTotal: Number(session.amount_total || 0),
            currency: String(session.currency || "gbp"),
            paymentStatus: String(session.payment_status || ""),
          }),
        },
        currentDocument: { exists: false },
      },
      {
        update: { name: userDocumentName, fields: firestoreFields(update) },
        updateMask: { fieldPaths: updateMask },
      },
    ]);
  } catch (error) {
    if (String(error.firestoreCode).includes("ALREADY_EXISTS") || /already exists/i.test(error.message || "")) {
      const repaired = await repairNonConsumableEntitlements(accessToken, projectId, firebaseUid, grants, timestamp);
      return { skipped: true, repaired, reason: "already_processed", firebaseUid, grants };
    }
    throw error;
  }

  return { updated: true, firebaseUid, grants };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return json(res, 405, { error: "Method not allowed" });
  }

  let firebaseUser;
  try {
    firebaseUser = await verifyFirebaseUserFromBearer(req);
  } catch (error) {
    const status = error?.code === "firebase_auth_unavailable" ? 503 : 401;
    const message = status === 503 ? "Could not verify Firebase sign-in token. Please try again." : "Please sign in again to confirm your purchase";
    return json(res, status, { error: message });
  }

  const body = await readJsonBody(req);
  const sessionId = String(body.sessionId || "").trim();
  if (!/^cs_(test|live)_/.test(sessionId)) {
    return json(res, 400, { error: "Invalid checkout session id" });
  }

  try {
    const session = await retrieveStripeCheckoutSession(sessionId);
    const sessionUid = String(session.client_reference_id || session.metadata?.firebaseUid || "");
    if (sessionUid !== firebaseUser.uid) {
      return json(res, 403, { error: "Checkout session belongs to a different user" });
    }
    if (!isPaidCheckoutSession(session)) {
      return json(res, 409, { error: "Checkout session is not paid yet" });
    }

    const result = await applyCheckoutSessionToFirebase(session);
    return json(res, 200, { received: true, ...result });
  } catch (error) {
    console.error("Checkout confirmation failed", error);
    return json(res, 500, { error: error?.message || "Could not confirm checkout session" });
  }
}
