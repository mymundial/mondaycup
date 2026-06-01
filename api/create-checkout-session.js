const MAX_GOLDEN_TICKETS = 99;

const STORE_ITEM_IDS = {
  allTeams: "allTeams",
  goldenBall: "goldenBall",
  goldenBoot: "goldenBoot",
  goldenGlove: "goldenGlove",
  goldenTicket: "goldenTicket",
  fullBundle: "fullBundle",
};

const STRIPE_API_VERSION = "2024-06-20";

function env(name, fallbackName = "") {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : "") || "";
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

function decodeFirebaseUidFromBearer(req) {
  const header = req.headers.authorization || req.headers.Authorization || "";
  const token = String(header).startsWith("Bearer ") ? String(header).slice(7) : "";
  if (!token || token.split(".").length < 2) return "";

  try {
    const payloadPart = token.split(".")[1];
    const json = Buffer.from(payloadPart.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const payload = JSON.parse(json);
    return String(payload.user_id || payload.sub || "").slice(0, 128);
  } catch {
    return "";
  }
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

  const firebaseUid = decodeFirebaseUidFromBearer(req);
  if (!firebaseUid) {
    return res.status(401).json({ error: "Please sign in before buying upgrades" });
  }

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
