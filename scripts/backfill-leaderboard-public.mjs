import crypto from "node:crypto";

const MAX_ROWS = Number(process.env.LEADERBOARD_BACKFILL_LIMIT || 500);

function env(name, fallbackName = "") {
  return process.env[name] || (fallbackName ? process.env[fallbackName] : "") || "";
}

function serviceAccountFromEnv() {
  const raw = env("FIREBASE_SERVICE_ACCOUNT_KEY") || env("FIREBASE_SERVICE_ACCOUNT_JSON") || env("GOOGLE_SERVICE_ACCOUNT_JSON") || "";
  if (!raw) return {};
  const candidates = [raw];
  try {
    candidates.push(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    // ignore
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
      // ignore
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
    "monday-cup"
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
  const serviceAccount = serviceAccountFromEnv();
  const clientEmail = env("FIREBASE_CLIENT_EMAIL") || serviceAccount.clientEmail;
  const privateKey = normalisePrivateKey(env("FIREBASE_PRIVATE_KEY") || serviceAccount.privateKey);
  if (!clientEmail || !privateKey) {
    throw new Error("Missing service account credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64Url(JSON.stringify({
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
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
    throw new Error(payload?.error_description || payload?.error || "Could not authenticate service account");
  }
  return payload.access_token;
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
  return Object.fromEntries(Object.entries(fields || {}).map(([key, value]) => [key, firestoreJsValue(value)]));
}

function firestoreValue(value) {
  if (value === null || typeof value === "undefined") return { nullValue: null };
  if (typeof value === "boolean") return { booleanValue: value };
  if (Number.isInteger(value)) return { integerValue: String(value) };
  if (typeof value === "number") return { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(firestoreValue) } };
  if (typeof value === "object") return { mapValue: { fields: firestoreFields(value) } };
  return { stringValue: String(value) };
}

function firestoreFields(object = {}) {
  return Object.fromEntries(
    Object.entries(object).filter(([, value]) => typeof value !== "undefined").map(([key, value]) => [key, firestoreValue(value)]),
  );
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

function truthyCosmeticValue(value) {
  if (Array.isArray(value)) return value.some(truthyCosmeticValue);
  if (value && typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "active")) return truthyCosmeticValue(value.active);
    if (Object.prototype.hasOwnProperty.call(value, "enabled")) return truthyCosmeticValue(value.enabled);
    if (Object.prototype.hasOwnProperty.call(value, "equipped")) return truthyCosmeticValue(value.equipped);
    if (Object.prototype.hasOwnProperty.call(value, "used")) return truthyCosmeticValue(value.used);
    if (Object.prototype.hasOwnProperty.call(value, "quantity")) return Number(value.quantity || 0) > 0;
    return Object.values(value).some(truthyCosmeticValue);
  }
  if (typeof value === "string") return !["", "false", "0", "no", "none", "off"].includes(value.trim().toLowerCase());
  return Boolean(value);
}

function normaliseCosmeticsApplied(...sources) {
  const safeSources = sources.filter((source) => source && typeof source === "object");
  const applied = {
    goldenBoot: safeSources.some((source) => truthyCosmeticValue(source.goldenBoot || source.golden_boot || source.boot || source.cosmetic3 || source.cosmeticBoot || source.cosmeticBootEquipped || source.goldenBootEquipped)),
    goldenBall: safeSources.some((source) => truthyCosmeticValue(source.goldenBall || source.golden_ball || source.ball || source.cosmeticBall || source.cosmeticBallEquipped || source.goldenBallEquipped)),
    goldenGlove: safeSources.some((source) => truthyCosmeticValue(source.goldenGlove || source.golden_glove || source.glove || source.cosmeticGlove || source.cosmeticGloveEquipped || source.goldenGloveEquipped)),
    goldenTicket: safeSources.some((source) => truthyCosmeticValue(source.goldenTicket || source.golden_ticket || source.ticket || source.cosmetic4 || source.goldenTicketUsed || source.usedGoldenTicket)),
  };
  if (!applied.goldenBoot && !applied.goldenBall && !applied.goldenGlove && !applied.goldenTicket) {
    const usedGeneric = safeSources.some((source) => truthyCosmeticValue(source.usedGoldenUpgrade || source.goldenUpgradeUsed || source.cosmeticsUsed || source.cosmeticsAppliedToCampaign || source.hasCosmeticsApplied || source.hasGoldenUpgrade));
    if (usedGeneric) applied.goldenTicket = true;
  }
  return applied;
}

function isTerminalFinish(value = "") {
  return /champion|runner|third|fourth|eliminated|knocked|lost|complete|completed|final/i.test(String(value || ""));
}

function podiumFromFinish(finish = "") {
  const raw = String(finish || "").toLowerCase();
  if (raw.includes("champion")) return "champions";
  if (raw.includes("runner")) return "runnerUp";
  if (raw.includes("third")) return "thirdPlace";
  return null;
}

function publicRowFromUserDoc(id, data = {}) {
  const bestCampaign = data.bestCampaign && typeof data.bestCampaign === "object" ? data.bestCampaign : {};
  const finish = String(data.finish || data.status || bestCampaign.finish || bestCampaign.status || bestCampaign.roundLabel || bestCampaign.stage || "");
  const completedAt = data.completedAt || bestCampaign.completedAt || null;
  if (!completedAt && !isTerminalFinish(finish)) return null;

  const score = number(data.gameScore ?? data.campaignPoints ?? data.points ?? bestCampaign.gameScore ?? bestCampaign.campaignPoints ?? bestCampaign.points, 0);
  if (score <= 0) return null;

  const profile = data.profile && typeof data.profile === "object" ? data.profile : {};
  const teamName = data.teamName || data.team || data.teamFlag || bestCampaign.teamName || bestCampaign.team || "";
  const cupRun = normaliseCupRun(data.cupRun, data.formGuide, data.form, data.tournamentProgress, bestCampaign.cupRun, bestCampaign.formGuide, bestCampaign.form, bestCampaign.tournamentProgress);
  const podium = data.podium || bestCampaign.podium || podiumFromFinish(finish);
  const cosmeticsApplied = normaliseCosmeticsApplied(
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
  );
  const usedGoldenUpgrade = Boolean(cosmeticsApplied.goldenBoot || cosmeticsApplied.goldenBall || cosmeticsApplied.goldenGlove || cosmeticsApplied.goldenTicket);

  return {
    uid: id,
    username: cleanUsername(data.username || profile.username || data.nickname || "PLAYER"),
    teamId: data.teamId || bestCampaign.teamId || null,
    teamName,
    gameScore: score,
    cupRun,
    finish: finish || "completed",
    podium,
    completedAt,
    updatedAt: new Date().toISOString(),
    cosmeticsApplied,
    activeCosmetics: cosmeticsApplied,
    upgradesApplied: cosmeticsApplied,
    usedUpgrades: cosmeticsApplied,
    usedGoldenUpgrade,
    goldenUpgradeUsed: usedGoldenUpgrade,
    cosmeticBootEquipped: Boolean(cosmeticsApplied.goldenBoot),
    cosmeticBallEquipped: Boolean(cosmeticsApplied.goldenBall),
    cosmeticGloveEquipped: Boolean(cosmeticsApplied.goldenGlove),
    goldenTicketUsed: Boolean(cosmeticsApplied.goldenTicket),
    bestCampaign: {
      ...bestCampaign,
      teamName,
      team: teamName,
      gameScore: score,
      campaignPoints: score,
      points: score,
      cupRun,
      finish: finish || "completed",
      podium,
      completedAt,
      cosmeticsApplied,
      activeCosmetics: cosmeticsApplied,
      upgradesApplied: cosmeticsApplied,
      usedUpgrades: cosmeticsApplied,
      usedGoldenUpgrade,
      goldenUpgradeUsed: usedGoldenUpgrade,
      cosmeticBootEquipped: Boolean(cosmeticsApplied.goldenBoot),
      cosmeticBallEquipped: Boolean(cosmeticsApplied.goldenBall),
      cosmeticGloveEquipped: Boolean(cosmeticsApplied.goldenGlove),
      goldenTicketUsed: Boolean(cosmeticsApplied.goldenTicket),
    },
  };
}

async function runQuery({ accessToken, projectId, collectionId, limit = MAX_ROWS }) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId }], limit } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Could not read ${collectionId}`);
  return Array.isArray(payload) ? payload.map((item) => item.document).filter(Boolean) : [];
}

async function writeLeaderboardRow({ accessToken, projectId, uid, row }) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/leaderboard/${encodeURIComponent(uid)}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: firestoreFields(row) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Could not write leaderboard/${uid}`);
}

const projectId = getFirebaseProjectId();
const accessToken = await getGoogleAccessToken();
const docs = await runQuery({ accessToken, projectId, collectionId: "users", limit: MAX_ROWS });
const rows = docs
  .map((document) => {
    const uid = String(document.name || "").split("/").pop();
    return uid ? { uid, row: publicRowFromUserDoc(uid, firestoreJsObject(document.fields || {})) } : null;
  })
  .filter((item) => item?.row);

let written = 0;
for (const { uid, row } of rows) {
  await writeLeaderboardRow({ accessToken, projectId, uid, row });
  written += 1;
}

console.log(`Backfilled ${written} public leaderboard rows into /leaderboard.`);
