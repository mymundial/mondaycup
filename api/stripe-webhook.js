import crypto from "crypto";

export const config = {
  api: {
    bodyParser: false,
  },
};

const MAX_GOLDEN_TICKETS = 99;
const STRIPE_WEBHOOK_TOLERANCE_SECONDS = 300;

const STORE_ITEM_IDS = {
  allTeams: "allTeams",
  goldenBall: "goldenBall",
  goldenBoot: "goldenBoot",
  goldenGlove: "goldenGlove",
  goldenTicket: "goldenTicket",
  fullBundle: "fullBundle",
};

let cachedGoogleAccessToken = null;
let cachedGoogleAccessTokenExpiry = 0;

function env(name, fallbackName = "") {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : "") || "";
}

function json(res, status, payload) {
  res.status(status).json(payload);
}

function base64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function normalisePrivateKey(value = "") {
  return String(value || "").replace(/\\n/g, "\n").trim();
}

function safeQuantity(value, { min = 0, max = MAX_GOLDEN_TICKETS } = {}) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

async function readRawBody(req) {
  if (Buffer.isBuffer(req.body)) return req.body;
  if (typeof req.body === "string") return Buffer.from(req.body, "utf8");

  // Signature verification requires the exact raw body. If an object is already parsed,
  // the signature cannot be trusted.
  if (req.body && typeof req.body === "object") {
    throw new Error("Webhook body was already parsed; raw body is required");
  }

  return await new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function parseStripeSignatureHeader(header = "") {
  const result = { timestamp: "", signatures: [] };
  String(header || "").split(",").forEach((part) => {
    const [key, value] = part.split("=");
    if (key === "t") result.timestamp = value;
    if (key === "v1") result.signatures.push(value);
  });
  return result;
}

function timingSafeEqualHex(a, b) {
  const left = Buffer.from(String(a || ""), "hex");
  const right = Buffer.from(String(b || ""), "hex");
  if (left.length !== right.length) return false;
  return crypto.timingSafeEqual(left, right);
}

function verifyStripeEvent(rawBody, signatureHeader, webhookSecret) {
  if (!webhookSecret) throw new Error("STRIPE_WEBHOOK_SECRET is not configured");
  if (!signatureHeader) throw new Error("Missing Stripe-Signature header");

  const { timestamp, signatures } = parseStripeSignatureHeader(signatureHeader);
  if (!timestamp || !signatures.length) throw new Error("Invalid Stripe-Signature header");

  const now = Math.floor(Date.now() / 1000);
  const signedAt = Number(timestamp);
  if (!Number.isFinite(signedAt) || Math.abs(now - signedAt) > STRIPE_WEBHOOK_TOLERANCE_SECONDS) {
    throw new Error("Stripe webhook timestamp is outside the allowed tolerance");
  }

  const payloadToSign = `${timestamp}.${rawBody.toString("utf8")}`;
  const expectedSignature = crypto
    .createHmac("sha256", webhookSecret)
    .update(payloadToSign, "utf8")
    .digest("hex");

  const verified = signatures.some((signature) => timingSafeEqualHex(signature, expectedSignature));
  if (!verified) throw new Error("Stripe webhook signature verification failed");

  return JSON.parse(rawBody.toString("utf8"));
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
        grants.goldenTicketQty += quantity; // Golden Kitbag includes 1 ticket.
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

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedGoogleAccessToken && cachedGoogleAccessTokenExpiry > now + 60) {
    return cachedGoogleAccessToken;
  }

  const clientEmail = env("FIREBASE_CLIENT_EMAIL");
  const privateKey = normalisePrivateKey(env("FIREBASE_PRIVATE_KEY"));
  if (!clientEmail || !privateKey) {
    throw new Error("Firebase service account credentials are not configured");
  }

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

function firestoreStringValue(value, fallback = "") {
  return value?.stringValue ?? fallback;
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

function getNestedFirestoreField(fields = {}, path = "") {
  return String(path || "").split(".").reduce((current, key) => {
    if (!current) return null;
    return firestoreMapFields(current[key]);
  }, fields);
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
    goldenTicketQty: safeQuantity(firestoreIntValue(ticket.quantity, 0)),
    goldenTicketTotalPurchased: Math.max(0, firestoreIntValue(ticket.totalPurchased, 0)),
  };
}

async function firestoreGetDocument(accessToken, projectId, ...segments) {
  const name = firestoreDocumentName(projectId, ...segments);
  const response = await fetch(`https://firestore.googleapis.com/v1/${name}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 404) return null;
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || "Could not read Firestore user document");
  }
  return payload;
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

  const updateMask = [
    "updatedAt",
    "lastPurchase",
    "payments.stripe",
  ];

  if (grants.allTeams) {
    update.upgradesPurchased = { ...(update.upgradesPurchased || {}), allTeams: true };
    update.unlocks = { allTeams: true };
    update.allTeamsEquipped = true;
    update.allTeamsUnlocked = true;
    updateMask.push("upgradesPurchased.allTeams", "unlocks.allTeams", "allTeamsEquipped", "allTeamsUnlocked");
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
        equipped: hasTickets,
        totalPurchased: nextTotalPurchased,
        lastPurchasedAt: timestamp,
      },
    };
    update.cosmeticsActive = { goldenTicket: hasTickets };
    update.cosmeticsEquipped = { goldenTicket: hasTickets };
    update.cosmetics = {
      goldenTicket: hasTickets,
      goldenTicketQuantity: nextTicketQty,
    };
    updateMask.push(
      "consumables.goldenTicket.quantity",
      "consumables.goldenTicket.equipped",
      "consumables.goldenTicket.totalPurchased",
      "consumables.goldenTicket.lastPurchasedAt",
      "cosmeticsActive.goldenTicket",
      "cosmeticsEquipped.goldenTicket",
      "cosmetics.goldenTicket",
      "cosmetics.goldenTicketQuantity"
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

function buildIdempotentEntitlementRepairUpdate(grants = {}, timestamp) {
  const update = { updatedAt: timestamp };
  const updateMask = ["updatedAt"];

  if (grants.allTeams) {
    update.upgradesPurchased = { ...(update.upgradesPurchased || {}), allTeams: true };
    update.unlocks = { allTeams: true };
    update.allTeamsEquipped = true;
    update.allTeamsUnlocked = true;
    updateMask.push("upgradesPurchased.allTeams", "unlocks.allTeams", "allTeamsEquipped", "allTeamsUnlocked");
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
  const projectId = env("FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID");
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
        update: {
          name: userDocumentName,
          fields: firestoreFields(update),
        },
        updateMask: {
          fieldPaths: updateMask,
        },
      },
    ]);
  } catch (error) {
    // Stripe may retry events. If the event marker already exists, treat it as successful.
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

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = verifyStripeEvent(rawBody, req.headers["stripe-signature"], env("STRIPE_WEBHOOK_SECRET"));
  } catch (error) {
    console.error("Stripe webhook verification failed", error);
    return json(res, 400, { error: error?.message || "Invalid Stripe webhook" });
  }

  if (event.type !== "checkout.session.completed") {
    return json(res, 200, { received: true, ignored: event.type });
  }

  const session = event.data?.object || {};
  if (!isPaidCheckoutSession(session)) {
    return json(res, 200, { received: true, ignored: "checkout_not_paid" });
  }

  try {
    const result = await applyCheckoutSessionToFirebase(session);
    return json(res, 200, { received: true, ...result });
  } catch (error) {
    console.error("Stripe webhook Firebase update failed", error);
    return json(res, 500, { error: error?.message || "Could not update purchase entitlements" });
  }
}
