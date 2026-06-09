import crypto from "node:crypto";

const MAX_USERS = Number(process.env.MIGRATION_USER_LIMIT || 1000);
const MAX_LEADERBOARD = Number(process.env.MIGRATION_LEADERBOARD_LIMIT || 1000);
const DRY_RUN = String(process.env.DRY_RUN || "").toLowerCase() === "true";

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
    // ignore invalid base64 candidates
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
      // ignore invalid json candidates
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
    Object.entries(object)
      .filter(([, value]) => typeof value !== "undefined")
      .map(([key, value]) => [key, firestoreValue(value)]),
  );
}

function setNested(target, path, value) {
  const parts = String(path).split(".").filter(Boolean);
  let cursor = target;
  for (let index = 0; index < parts.length - 1; index += 1) {
    const key = parts[index];
    cursor[key] = cursor[key] && typeof cursor[key] === "object" && !Array.isArray(cursor[key]) ? cursor[key] : {};
    cursor = cursor[key];
  }
  cursor[parts[parts.length - 1]] = value;
}

function fieldExists(object, path) {
  const parts = String(path).split(".").filter(Boolean);
  let cursor = object;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object" || !Object.prototype.hasOwnProperty.call(cursor, part)) return false;
    cursor = cursor[part];
  }
  return true;
}

function getNested(object, path) {
  const parts = String(path).split(".").filter(Boolean);
  let cursor = object;
  for (const part of parts) {
    if (!cursor || typeof cursor !== "object") return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

function normalisePodium(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (["champion", "champions", "winner", "1", "1st", "first"].includes(raw)) return "champion";
  if (["runner-up", "runnerup", "runner_up", "runner up", "2", "2nd", "second"].includes(raw)) return "runner-up";
  if (["third-place", "thirdplace", "third_place", "third place", "3", "3rd", "third"].includes(raw)) return "third-place";
  return raw ? raw : "none";
}

function truthyUsedUpgrade(value) {
  if (Array.isArray(value)) return value.some(truthyUsedUpgrade);
  if (value && typeof value === "object") {
    if (Object.prototype.hasOwnProperty.call(value, "used")) return truthyUsedUpgrade(value.used);
    if (Object.prototype.hasOwnProperty.call(value, "applied")) return truthyUsedUpgrade(value.applied);
    if (Object.prototype.hasOwnProperty.call(value, "active")) return truthyUsedUpgrade(value.active);
    return Object.values(value).some(truthyUsedUpgrade);
  }
  if (typeof value === "string") return !["", "false", "0", "no", "none", "off"].includes(value.trim().toLowerCase());
  return Boolean(value);
}

function inferUsedGoldenUpgrade(source = {}) {
  return Boolean(
    truthyUsedUpgrade(source.usedGoldenUpgrade) ||
    truthyUsedUpgrade(source.goldenUpgradeUsed) ||
    truthyUsedUpgrade(source.goldenTicketUsed) ||
    truthyUsedUpgrade(source.cosmeticsApplied) ||
    truthyUsedUpgrade(source.upgradesApplied) ||
    truthyUsedUpgrade(source.usedUpgrades)
  );
}

async function runQuery({ accessToken, projectId, collectionId, limit }) {
  const response = await fetch(`https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents:runQuery`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId }], limit } }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Could not read ${collectionId}`);
  return Array.isArray(payload) ? payload.map((item) => item.document).filter(Boolean) : [];
}

async function patchDocument({ accessToken, documentName, setFields = {}, deletePaths = [] }) {
  const updatePaths = [...Object.keys(setFields), ...deletePaths];
  if (!updatePaths.length) return false;

  const params = new URLSearchParams();
  for (const path of updatePaths) params.append("updateMask.fieldPaths", path);

  const nestedFields = {};
  for (const [path, value] of Object.entries(setFields)) setNested(nestedFields, path, value);

  if (DRY_RUN) {
    console.log("DRY RUN patch", documentName, { setFields, deletePaths });
    return true;
  }

  const response = await fetch(`https://firestore.googleapis.com/v1/${documentName}?${params.toString()}`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ fields: firestoreFields(nestedFields) }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error?.message || `Could not patch ${documentName}`);
  return true;
}

const LEADERBOARD_DELETE_FIELDS = ["finish", "teamId"];
const BEST_CAMPAIGN_DELETE_FIELDS = [
  "bestCampaign.status",
  "bestCampaign.teamId",
  "bestCampaign.groupPosition",
  "bestCampaign.finish",
  "bestCampaign.activeCosmetics",
  "bestCampaign.cosmeticsApplied",
  "bestCampaign.upgradesApplied",
  "bestCampaign.goldenTicketUsed",
  "bestCampaign.goldenUpgradeUsed",
  "bestCampaign.cosmeticBallEquipped",
  "bestCampaign.cosmeticBootEquipped",
  "bestCampaign.cosmeticGloveEquipped",
];
const CURRENT_CAMPAIGN_DELETE_FIELDS = [
  "currentCampaign.penaltyLog",
  "currentCampaign.shotLog",
  "currentCampaign.shotHistory",
  "currentCampaign.accuracyHistory",
  "currentCampaign.powerHistory",
  "currentCampaign.commentaryHistory",
  "currentCampaign.resultModal",
  "currentCampaign.modalState",
  "currentCampaign.cosmeticsApplied",
  "currentCampaign.activeCosmetics",
  "currentCampaign.upgradesApplied",
  "currentCampaign.upgradesUsed",
  "currentCampaign.usedUpgrades",
  "currentCampaign.groupResults",
  "currentCampaign.groupStandings",
  "currentCampaign.fixtures",
  "currentCampaign.schedule",
];

function leaderboardPatch(data) {
  const setFields = {};
  const deletePaths = LEADERBOARD_DELETE_FIELDS.filter((path) => fieldExists(data, path));
  const podium = normalisePodium(data.podium);
  if (data.podium !== podium) setFields.podium = podium;
  if (typeof data.usedGoldenUpgrade !== "boolean") setFields.usedGoldenUpgrade = inferUsedGoldenUpgrade(data);
  return { setFields, deletePaths };
}

function userPatch(data) {
  const setFields = {};
  const deletePaths = [];

  if (data.bestCampaign && typeof data.bestCampaign === "object") {
    const podium = normalisePodium(data.bestCampaign.podium);
    if (data.bestCampaign.podium !== podium) setFields["bestCampaign.podium"] = podium;
    for (const path of BEST_CAMPAIGN_DELETE_FIELDS) {
      if (fieldExists(data, path)) deletePaths.push(path);
    }
  }

  if (data.currentCampaign && typeof data.currentCampaign === "object") {
    if (typeof data.currentCampaign.usedGoldenUpgrade !== "boolean") {
      setFields["currentCampaign.usedGoldenUpgrade"] = inferUsedGoldenUpgrade(data.currentCampaign);
    }
    for (const path of CURRENT_CAMPAIGN_DELETE_FIELDS) {
      if (fieldExists(data, path)) deletePaths.push(path);
    }
  }

  return { setFields, deletePaths };
}

const projectId = getFirebaseProjectId();
const accessToken = await getGoogleAccessToken();

const leaderboardDocs = await runQuery({ accessToken, projectId, collectionId: "leaderboard", limit: MAX_LEADERBOARD });
let leaderboardPatched = 0;
for (const document of leaderboardDocs) {
  const data = firestoreJsObject(document.fields || {});
  const patch = leaderboardPatch(data);
  if (await patchDocument({ accessToken, documentName: document.name, ...patch })) leaderboardPatched += 1;
}

const userDocs = await runQuery({ accessToken, projectId, collectionId: "users", limit: MAX_USERS });
let usersPatched = 0;
for (const document of userDocs) {
  const data = firestoreJsObject(document.fields || {});
  const patch = userPatch(data);
  if (await patchDocument({ accessToken, documentName: document.name, ...patch })) usersPatched += 1;
}

console.log(`Migration complete. Leaderboard docs patched: ${leaderboardPatched}. User docs patched: ${usersPatched}.${DRY_RUN ? " DRY RUN only." : ""}`);
