import crypto from "crypto";

const MAX_GOLDEN_TICKETS = 99;
const DEFAULT_FIREBASE_PROJECT_ID = "monday-cup";
const FIREBASE_CERTS_URL = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const TOKEN_CLOCK_SKEW_SECONDS = 300;

const STORE_ITEM_IDS = {
  allTeams: "allTeams",
  goldenBall: "goldenBall",
  goldenBoot: "goldenBoot",
  goldenGlove: "goldenGlove",
  goldenTicket: "goldenTicket",
  fullBundle: "fullBundle",
};

const STRIPE_API_VERSION = "2024-06-20";

let cachedFirebaseCerts = null;
let cachedFirebaseCertsExpiry = 0;

function env(name, fallbackName = "") {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : "") || "";
}

function getFirebaseProjectId() {
  return (
    env("FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID") ||
    env("GOOGLE_CLOUD_PROJECT") ||
    env("GCLOUD_PROJECT") ||
    DEFAULT_FIREBASE_PROJECT_ID
  );
}

const PRICE_ENV = {
  [STORE_ITEM_IDS.allTeams]: ["STRIPE_PRICE_ALL_TEAMS", "VITE_STRIPE_PRICE_ALL_TEAMS"],
  [STORE_ITEM_IDS.goldenBoot]: ["STRIPE_PRICE_GOLDEN_BOOT", "VITE_STRIPE_PRICE_GOLDEN_BOOT"],
  [STORE_ITEM_IDS.goldenBall]: ["STRIPE_PRICE_GOLDEN_BALL", "VITE_STRIPE_PRICE_GOLDEN_BALL"],
  [STORE_ITEM_IDS.goldenGlove]: ["STRIPE_PRICE_GOLDEN_GLOVE", "VITE_STRIPE_PRICE_GOLDEN_GLOVE"],
  [STORE_ITEM_IDS.goldenTicket]: ["STRIPE_PRICE_GOLDEN_TICKET", "VITE_STRIPE_PRICE_GOLDEN_TICKET"],
  [STORE_ITEM_IDS.fullBundle]: ["STRIPE_PRICE_FULL_BUNDLE", "VITE_STRIPE_PRICE_FULL_BUNDLE"],
};

const ITEM_LABELS = {
  [STORE_ITEM_IDS.allTeams]: "All Teams",
  [STORE_ITEM_IDS.goldenBoot]: "Golden Boot",
  [STORE_ITEM_IDS.goldenBall]: "Golden Ball",
  [STORE_ITEM_IDS.goldenGlove]: "Golden Glove",
  [STORE_ITEM_IDS.goldenTicket]: "Golden Ticket",
  [STORE_ITEM_IDS.fullBundle]: "Golden Kitbag",
};

function getPriceId(itemId) {
  const names = PRICE_ENV[itemId] || [];
  return env(names[0], names[1]);
}

function safeQuantity(value, { min = 0, max = 1 } = {}) {
  const number = Number(value || 0);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, Math.floor(number)));
}

function getOrigin(req) {
  const configured = env("APP_URL", "VITE_APP_URL") || env("SITE_URL", "VITE_SITE_URL");
  if (configured) return configured.replace(/\/$/, "");
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  if (host) return `${protocol}://${host}`.replace(/\/$/, "");
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:5173";
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

function normaliseSelection(selection = {}) {
  const rawItems = selection?.items && typeof selection.items === "object" ? selection.items : {};
  const hasBundle = safeQuantity(rawItems[STORE_ITEM_IDS.fullBundle], { min: 0, max: 1 }) > 0;
  const lineItems = [];

  const pushItem = (itemId, quantity) => {
    const qty = safeQuantity(quantity, {
      min: 0,
      max: itemId === STORE_ITEM_IDS.goldenTicket ? MAX_GOLDEN_TICKETS : 1,
    });
    if (!qty) return;
    lineItems.push({ itemId, quantity: qty });
  };

  if (hasBundle) {
    pushItem(STORE_ITEM_IDS.fullBundle, 1);
    const extraTickets = safeQuantity(rawItems[STORE_ITEM_IDS.goldenTicket], { min: 0, max: MAX_GOLDEN_TICKETS - 1 });
    if (extraTickets > 0) pushItem(STORE_ITEM_IDS.goldenTicket, extraTickets);
  } else {
    pushItem(STORE_ITEM_IDS.allTeams, rawItems[STORE_ITEM_IDS.allTeams]);
    pushItem(STORE_ITEM_IDS.goldenBoot, rawItems[STORE_ITEM_IDS.goldenBoot]);
    pushItem(STORE_ITEM_IDS.goldenBall, rawItems[STORE_ITEM_IDS.goldenBall]);
    pushItem(STORE_ITEM_IDS.goldenGlove, rawItems[STORE_ITEM_IDS.goldenGlove]);
    pushItem(STORE_ITEM_IDS.goldenTicket, rawItems[STORE_ITEM_IDS.goldenTicket]);
  }

  return lineItems;
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

function addLineItems(params, lineItems) {
  lineItems.forEach((lineItem, index) => {
    const price = getPriceId(lineItem.itemId);
    if (!price) {
      throw new Error(`Missing Stripe price id for ${ITEM_LABELS[lineItem.itemId] || lineItem.itemId}`);
    }
    params.append(`line_items[${index}][price]`, price);
    params.append(`line_items[${index}][quantity]`, String(lineItem.quantity));
  });
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const stripeSecretKey = env("STRIPE_SECRET_KEY");
  if (!stripeSecretKey) {
    return res.status(500).json({ error: "Stripe secret key is not configured" });
  }

  let firebaseUser;
  try {
    firebaseUser = await verifyFirebaseUserFromBearer(req);
  } catch (error) {
    const status = error?.code === "firebase_auth_unavailable" ? 503 : 401;
    const message =
      status === 503
        ? "Could not verify Firebase sign-in token. Please try again."
        : "Please sign in again before buying upgrades";
    return res.status(status).json({ error: message });
  }

  if (!firebaseUser.emailVerified) {
    return res.status(403).json({ error: "Please verify your email before buying upgrades" });
  }

  const firebaseUid = firebaseUser.uid;
  const body = await readJsonBody(req);
  const selection = body.selection || {};
  const source = String(body.source || "monday-shop").slice(0, 80);
  const lineItems = normaliseSelection(selection);

  if (!lineItems.length) {
    return res.status(400).json({ error: "No valid shop items selected" });
  }

  const origin = getOrigin(req);
  const selectedSummary = lineItems.map((item) => `${item.itemId}:${item.quantity}`).join(",");
  const params = new URLSearchParams();

  params.append("mode", "payment");
  params.append("success_url", `${origin}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`);
  params.append("cancel_url", `${origin}/?checkout=cancelled`);
  params.append("client_reference_id", firebaseUid);
  params.append("metadata[firebaseUid]", firebaseUid);
  params.append("metadata[source]", source);
  params.append("metadata[selectedItems]", selectedSummary.slice(0, 500));
  params.append("payment_intent_data[metadata][firebaseUid]", firebaseUid);
  params.append("payment_intent_data[metadata][selectedItems]", selectedSummary.slice(0, 500));
  params.append("allow_promotion_codes", "false");

  try {
    addLineItems(params, lineItems);

    const stripeResponse = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${stripeSecretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Stripe-Version": STRIPE_API_VERSION,
      },
      body: params,
    });

    const payload = await stripeResponse.json().catch(() => ({}));

    if (!stripeResponse.ok) {
      const message = payload?.error?.message || "Could not create Stripe checkout session";
      return res.status(stripeResponse.status || 500).json({ error: message });
    }

    return res.status(200).json({ url: payload.url, id: payload.id });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Could not create checkout session" });
  }
}
