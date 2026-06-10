import crypto from "crypto";

const DEFAULT_FIREBASE_PROJECT_ID = "monday-cup";
const MAX_PUBLIC_ROWS = 50;

let cachedGoogleAccessToken = null;
let cachedGoogleAccessTokenExpiry = 0;

function env(name, fallbackName = "") {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : "") || "";
}

function setPublicCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", env("PUBLIC_LEADERBOARD_ALLOWED_ORIGIN") || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Accept");
  res.setHeader("Vary", "Origin");
}

function serviceAccountFromEnv() {
  const raw = env("FIREBASE_SERVICE_ACCOUNT_KEY") || env("FIREBASE_SERVICE_ACCOUNT_JSON") || env("GOOGLE_SERVICE_ACCOUNT_JSON") || "";
  if (!raw) return {};
  const candidates = [raw];
  try {
    candidates.push(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    // Not base64; ignore.
  }
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return {
        clientEmail: parsed.client_email || parsed.clientEmail || "",
        privateKey: parsed.private_key || parsed.privateKey || "",
        projectId: parsed.project_id || parsed.projectId || "",
      };
    } catch {
      // Try the next representation.
    }
  }
  return {};
}

function getFirebaseProjectId() {
  const serviceAccount = serviceAccountFromEnv();
  return (
    env("FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID") ||
    serviceAccount.projectId ||
    env("GOOGLE_CLOUD_PROJECT") ||
    env("GCLOUD_PROJECT") ||
    DEFAULT_FIREBASE_PROJECT_ID
  );
}

function normalisePrivateKey(value = "") {
  return String(value || "").replace(/\\n/g, "\n");
}

function base64Url(value) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

async function getGoogleAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  if (cachedGoogleAccessToken && cachedGoogleAccessTokenExpiry > now + 60) return cachedGoogleAccessToken;

  const serviceAccount = serviceAccountFromEnv();
  const clientEmail = env("FIREBASE_CLIENT_EMAIL") || serviceAccount.clientEmail;
  const privateKey = normalisePrivateKey(env("FIREBASE_PRIVATE_KEY") || serviceAccount.privateKey);
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
  const signature = crypto
    .sign("RSA-SHA256", Buffer.from(unsignedJwt), privateKey)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${unsignedJwt}.${signature}`,
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

function firestoreJsValue(value) {
  if (!value || typeof value !== "object") return undefined;
  if (Object.prototype.hasOwnProperty.call(value, "stringValue")) return value.stringValue;
  if (Object.prototype.hasOwnProperty.call(value, "integerValue")) return Number(value.integerValue || 0);
  if (Object.prototype.hasOwnProperty.call(value, "doubleValue")) return Number(value.doubleValue || 0);
  if (Object.prototype.hasOwnProperty.call(value, "booleanValue")) return Boolean(value.booleanValue);
  if (Object.prototype.hasOwnProperty.call(value, "timestampValue")) return value.timestampValue;
  if (Object.prototype.hasOwnProperty.call(value, "nullValue")) return null;
  if (value.arrayValue) return (value.arrayValue.values || []).map(firestoreJsValue);
  if (value.mapValue) return firestoreJsObject(value.mapValue.fields || {});
  return undefined;
}

function firestoreJsObject(fields = {}) {
  return Object.fromEntries(
    Object.entries(fields || {}).map(([key, value]) => [key, firestoreJsValue(value)]),
  );
}

function docIdFromName(name = "") {
  return String(name || "").split("/").pop() || "";
}

function number(value, fallback = 0) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanUsername(value, fallback = "PLAYER") {
  return String(value || fallback).trim().slice(0, 10).toUpperCase() || fallback;
}

function normaliseCupRun(...sources) {
  const source = sources.find((candidate) => Array.isArray(candidate) && candidate.length) || [];
  return Array.from({ length: 8 }, (_, index) => source[index] ?? null);
}

const COSMETIC_ALIASES = {
  goldenBoot: ["goldenBoot", "golden_boot", "boot", "cosmetic3", "cosmeticBoot", "cosmeticBootEquipped", "goldenBootEquipped"],
  goldenBall: ["goldenBall", "golden_ball", "ball", "cosmeticBall", "cosmeticBallEquipped", "goldenBallEquipped"],
  goldenGlove: ["goldenGlove", "golden_glove", "glove", "cosmeticGlove", "cosmeticGloveEquipped", "goldenGloveEquipped"],
  goldenTicket: ["goldenTicket", "golden_ticket", "ticket", "cosmetic4", "goldenTicketUsed", "usedGoldenTicket"],
};

const GENERIC_UPGRADE_FLAGS = [
  "usedGoldenUpgrade",
  "goldenUpgradeUsed",
  "cosmeticsUsed",
  "cosmeticsAppliedToCampaign",
  "hasCosmeticsApplied",
  "hasGoldenUpgrade",
];

function truthyCosmeticValue(value) {
  if (Array.isArray(value)) return value.some(truthyCosmeticValue);
  if (value && typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "active")) return truthyCosmeticValue(value.active);
    if (Object.prototype.hasOwnProperty.call(value, "enabled")) return truthyCosmeticValue(value.enabled);
    if (Object.prototype.hasOwnProperty.call(value, "equipped")) return truthyCosmeticValue(value.equipped);
    if (Object.prototype.hasOwnProperty.call(value, "used")) return truthyCosmeticValue(value.used);
    if (Object.prototype.hasOwnProperty.call(value, "quantity")) return number(value.quantity, 0) > 0;
    return Object.values(value).some(truthyCosmeticValue);
  }
  if (typeof value === "string") return !["", "false", "0", "no", "none", "off"].includes(value.trim().toLowerCase());
  return Boolean(value);
}

function cosmeticFlagFromSource(source = {}, key) {
  if (!source || typeof source !== "object") return false;
  const aliases = COSMETIC_ALIASES[key] || [key];
  return aliases.some((alias) => truthyCosmeticValue(source[alias]));
}

function genericUpgradeFlagFromSource(source = {}) {
  if (!source || typeof source !== "object") return false;
  return GENERIC_UPGRADE_FLAGS.some((key) => truthyCosmeticValue(source[key]));
}

function normaliseCosmeticsApplied(...sources) {
  const safeSources = sources.filter((source) => source && typeof source === "object");
  const applied = {
    goldenBoot: safeSources.some((source) => cosmeticFlagFromSource(source, "goldenBoot")),
    goldenBall: safeSources.some((source) => cosmeticFlagFromSource(source, "goldenBall")),
    goldenGlove: safeSources.some((source) => cosmeticFlagFromSource(source, "goldenGlove")),
    goldenTicket: safeSources.some((source) => cosmeticFlagFromSource(source, "goldenTicket")),
  };
  if (!applied.goldenBoot && !applied.goldenBall && !applied.goldenGlove && !applied.goldenTicket) {
    if (safeSources.some(genericUpgradeFlagFromSource)) applied.goldenTicket = true;
  }
  return applied;
}

function usesLeaderboardUpgrade(row = {}) {
  const bestCampaign = row.bestCampaign && typeof row.bestCampaign === "object" ? row.bestCampaign : {};
  const sources = [
    row,
    row.cosmeticsApplied,
    row.activeCosmetics,
    row.upgradesApplied,
    row.upgradesUsed,
    row.usedUpgrades,
    bestCampaign,
    bestCampaign.cosmeticsApplied,
    bestCampaign.activeCosmetics,
    bestCampaign.upgradesApplied,
    bestCampaign.upgradesUsed,
    bestCampaign.usedUpgrades,
  ];
  const cosmeticsApplied = normaliseCosmeticsApplied(...sources);
  return Boolean(
    cosmeticsApplied.goldenBoot ||
    cosmeticsApplied.goldenBall ||
    cosmeticsApplied.goldenGlove ||
    cosmeticsApplied.goldenTicket ||
    sources.some(genericUpgradeFlagFromSource)
  );
}

function isTerminalFinish(value = "") {
  const raw = String(value || "").toLowerCase();
  return /champion|runner|third|fourth|eliminated|knocked|lost|complete|completed/.test(raw);
}

function podiumFromFinish(...values) {
  for (const value of values) {
    const raw = String(value || "").trim().toLowerCase();
    if (!raw || ["none", "null", "false", "no", "na", "n/a", "inprogress", "in progress"].includes(raw)) continue;
    if (raw.includes("champion") || raw === "winner" || raw === "won" || raw === "first" || raw === "1") return "champion";
    if (raw.includes("runner") || raw.includes("second") || raw === "runnerup" || raw === "runner-up" || raw === "silver" || raw === "2") return "runner-up";
    if (raw.includes("third") || raw.includes("bronze") || raw === "thirdplace" || raw === "third-place" || raw === "3") return "third-place";
  }
  return "none";
}

function leaderboardPodium(value = "") {
  const raw = String(value || "").toLowerCase();
  if (raw.includes("champion")) return "champion";
  if (raw.includes("runner")) return "runnerUp";
  if (raw.includes("third")) return "thirdPlace";
  return null;
}

function buildPublicLeaderboardRow(id, data = {}, source = "leaderboard") {
  const bestCampaign = data.bestCampaign && typeof data.bestCampaign === "object" ? data.bestCampaign : {};
  const userId = data.uid || data.userId || id;
  if (!userId || userId === "guest-preview" || data.localOnly) return null;

  const score = number(data.gameScore ?? data.campaignPoints ?? data.points ?? bestCampaign.gameScore ?? bestCampaign.campaignPoints ?? bestCampaign.points, 0);
  if (score <= 0) return null;

  const finish = String(data.finish || data.status || data.phase || data.round || bestCampaign.finish || bestCampaign.status || bestCampaign.phase || bestCampaign.round || bestCampaign.roundLabel || bestCampaign.stage || "inProgress");
  const completedAt = data.completedAt || bestCampaign.completedAt || null;
  if (source === "users" && !completedAt && !isTerminalFinish(finish)) return null;

  const profile = data.profile && typeof data.profile === "object" ? data.profile : {};
  const teamName = data.teamName || data.team || data.teamFlag || bestCampaign.teamName || bestCampaign.team || "";
  const cupRun = normaliseCupRun(
    data.cupRun,
    data.formGuide,
    data.form,
    data.tournamentProgress,
    bestCampaign.cupRun,
    bestCampaign.formGuide,
    bestCampaign.form,
    bestCampaign.tournamentProgress,
  );
  const podiumCanonical = podiumFromFinish(data.podium, bestCampaign.podium, finish, data.phase, data.round, bestCampaign.phase, bestCampaign.round, bestCampaign.roundLabel, bestCampaign.stage);
  const podium = leaderboardPodium(podiumCanonical);
  const upgradeSources = source === "users" && Object.keys(bestCampaign).length
    ? [
        bestCampaign,
        bestCampaign.cosmeticsApplied,
        bestCampaign.activeCosmetics,
        bestCampaign.upgradesApplied,
        bestCampaign.upgradesUsed,
        bestCampaign.usedUpgrades,
      ]
    : [
        data,
        data.cosmeticsApplied,
        data.activeCosmetics,
        data.upgradesApplied,
        data.upgradesUsed,
        data.usedUpgrades,
        bestCampaign,
        bestCampaign.cosmeticsApplied,
        bestCampaign.activeCosmetics,
        bestCampaign.upgradesApplied,
        bestCampaign.upgradesUsed,
        bestCampaign.usedUpgrades,
      ];
  const cosmeticsApplied = normaliseCosmeticsApplied(...upgradeSources);
  const usedGoldenUpgrade = Boolean(
    cosmeticsApplied.goldenBoot ||
    cosmeticsApplied.goldenBall ||
    cosmeticsApplied.goldenGlove ||
    cosmeticsApplied.goldenTicket ||
    upgradeSources.some(genericUpgradeFlagFromSource)
  );

  return {
    id,
    uid: userId,
    userId,
    username: cleanUsername(data.username || profile.username || data.nickname || "PLAYER"),
    
    teamName,
    teamFlag: teamName,
    team: teamName,
    gameScore: score,
    campaignPoints: score,
    cupRun,
    formGuide: cupRun,
    form: cupRun,
    tournamentProgress: cupRun,
    
    podium,
    podiumAchieved: Boolean(podium || /champion|runner|third/i.test(String(finish))),
    completedAt,
    updatedAt: data.updatedAt || null,
    usedGoldenUpgrade,
    bestCampaign: {
      exists: true,
      teamName,
      team: teamName,
      gameScore: score,
      cupRun,
      phase: bestCampaign.phase || finish,
      round: bestCampaign.round || bestCampaign.phase || finish,
      podium: podiumCanonical || "none",
      completedAt,
      updatedAt: bestCampaign.updatedAt || data.updatedAt || null,
    },
  };
}

async function runFirestoreQuery({ accessToken, projectId, collectionId, orderField, direction = "DESCENDING", limit = MAX_PUBLIC_ROWS }) {
  const structuredQuery = {
    from: [{ collectionId }],
    limit,
  };

  if (orderField) {
    structuredQuery.orderBy = [{ field: { fieldPath: orderField }, direction }];
  }

  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ structuredQuery }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload?.error?.message || `Could not read ${collectionId}`);
  }

  return Array.isArray(payload)
    ? payload.map((item) => item.document).filter(Boolean)
    : [];
}

async function loadCollectionRows({ accessToken, projectId, collectionId, source, orderFields = [], limit }) {
  const docsById = new Map();
  const queries = [...orderFields, null];

  for (const orderField of queries) {
    try {
      const docs = await runFirestoreQuery({ accessToken, projectId, collectionId, orderField, limit });
      docs.forEach((document) => {
        const id = docIdFromName(document.name);
        if (id && !docsById.has(id)) docsById.set(id, firestoreJsObject(document.fields || {}));
      });
      if (docsById.size >= limit) break;
    } catch (error) {
      // Try the next query shape. Older projects can have different score fields/indexes.
      console.warn(`Public leaderboard ${collectionId} query failed`, error?.message || error);
    }
  }

  return Array.from(docsById.entries())
    .map(([id, data]) => buildPublicLeaderboardRow(id, { ...data, uid: data.uid || data.userId || id }, source))
    .filter(Boolean);
}

export default async function handler(req, res) {
  setPublicCorsHeaders(res);

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "s-maxage=30, stale-while-revalidate=120");

  const limit = Math.max(1, Math.min(MAX_PUBLIC_ROWS, Math.floor(Number(req.query?.limit || MAX_PUBLIC_ROWS)) || MAX_PUBLIC_ROWS));

  try {
    const projectId = getFirebaseProjectId();
    const accessToken = await getGoogleAccessToken();
    const bestByUser = new Map();

    const addRow = (row) => {
      if (!row) return;
      const key = row.userId || row.uid || row.id;
      if (!key) return;
      const normalisedRow = { ...row, uid: row.uid || key, userId: key };
      const existing = bestByUser.get(key);
      const rowScore = number(normalisedRow.gameScore, 0);
      const existingScore = number(existing?.gameScore, 0);
      const rowHasUpgradeData = usesLeaderboardUpgrade(normalisedRow);
      const existingHasUpgradeData = usesLeaderboardUpgrade(existing);
      if (!existing || rowScore > existingScore || (rowScore === existingScore && rowHasUpgradeData && !existingHasUpgradeData)) {
        bestByUser.set(key, normalisedRow);
      }
    };

    const leaderboardRows = await loadCollectionRows({
      accessToken,
      projectId,
      collectionId: "leaderboard",
      source: "leaderboard",
      orderFields: ["gameScore", "campaignPoints", "points"],
      limit,
    });
    leaderboardRows.forEach(addRow);

    const userRows = await loadCollectionRows({
      accessToken,
      projectId,
      collectionId: "users",
      source: "users",
      orderFields: ["bestCampaign.gameScore", "bestCampaign.campaignPoints", "bestCampaign.points"],
      limit: Math.max(limit, 50),
    });
    userRows.forEach(addRow);

    const rows = Array.from(bestByUser.values())
      .sort((a, b) => number(b.gameScore, 0) - number(a.gameScore, 0))
      .slice(0, limit);

    return res.status(200).json({ rows });
  } catch (error) {
    return res.status(500).json({ error: error?.message || "Could not load public leaderboard" });
  }
}
