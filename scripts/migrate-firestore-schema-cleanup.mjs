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
  try { candidates.push(Buffer.from(raw, "base64").toString("utf8")); } catch {}
  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      return {
        clientEmail: parsed.client_email || parsed.clientEmail || "",
        privateKey: parsed.private_key || parsed.privateKey || "",
        projectId: parsed.project_id || parsed.projectId || "",
      };
    } catch {}
  }
  return {};
}

function getFirebaseProjectId() {
  const serviceAccount = serviceAccountFromEnv();
  return env("FIREBASE_PROJECT_ID", "VITE_FIREBASE_PROJECT_ID") || serviceAccount.projectId || env("GOOGLE_CLOUD_PROJECT") || env("GCLOUD_PROJECT") || "monday-cup";
}

function normalisePrivateKey(value = "") {
  return String(value || "").replace(/\\n/g, "\n");
}

function base64Url(value) {
  return Buffer.from(value).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function getGoogleAccessToken() {
  const serviceAccount = serviceAccountFromEnv();
  const clientEmail = env("FIREBASE_CLIENT_EMAIL") || serviceAccount.clientEmail;
  const privateKey = normalisePrivateKey(env("FIREBASE_PRIVATE_KEY") || serviceAccount.privateKey);
  if (!clientEmail || !privateKey) throw new Error("Missing service account credentials. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY.");

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claimSet = base64Url(JSON.stringify({ iss: clientEmail, scope: "https://www.googleapis.com/auth/datastore", aud: "https://oauth2.googleapis.com/token", iat: now, exp: now + 3600 }));
  const unsignedJwt = `${header}.${claimSet}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(unsignedJwt), privateKey).toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: `${unsignedJwt}.${signature}` }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.access_token) throw new Error(payload?.error_description || payload?.error || "Could not authenticate service account");
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
  return Object.fromEntries(Object.entries(object).filter(([, value]) => typeof value !== "undefined").map(([key, value]) => [key, firestoreValue(value)]));
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

function firstDefined(...values) {
  return values.find((value) => typeof value !== "undefined" && value !== null && value !== "");
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalisePodium(value, phase = "", round = "", finish = "") {
  const raw = String(firstDefined(value, finish, phase, round, "") || "").trim().toLowerCase();
  if (["champion", "champions", "winner", "won", "1", "1st", "first", "monday cup champion"].includes(raw) || raw.includes("champion")) return "champion";
  if (["runner-up", "runnerup", "runner_up", "runner up", "2", "2nd", "second"].includes(raw) || raw.includes("runner")) return "runner-up";
  if (["third-place", "thirdplace", "third_place", "third place", "3", "3rd", "third"].includes(raw) || raw.includes("third")) return "third-place";
  return "none";
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

function normaliseCupRun(value) {
  return Array.isArray(value) ? value.slice(0, 8) : [];
}

function cleanBestCampaign(source = {}) {
  const phase = firstDefined(source.phase, source.round, source.roundLabel, source.stage, source.finish, source.status, "Not Started");
  return {
    exists: Boolean(source.exists ?? source.teamName ?? source.team ?? source.gameScore),
    gameScore: number(source.gameScore ?? source.points ?? source.campaignPoints, 0),
    teamName: firstDefined(source.teamName, source.team, null),
    cupRun: normaliseCupRun(firstDefined(source.cupRun, source.formGuide, source.form, source.tournamentProgress, [])),
    phase,
    podium: normalisePodium(source.podium, phase, source.round, source.finish),
    completedAt: firstDefined(source.completedAt, source.updatedAt, null),
    updatedAt: firstDefined(source.updatedAt, null),
  };
}

function normaliseMatchSnapshot(match = {}, index = 0) {
  if (!match || typeof match !== "object") return null;
  const out = {
    matchId: firstDefined(match.matchId, match.id, match.fixtureId, match.key, index + 1),
    round: firstDefined(match.round, match.phase, match.stage, match.matchStage),
    group: firstDefined(match.group, match.groupId, match.pool),
    homeTeam: firstDefined(match.homeTeam, match.home, match.homeName, match.teamA, match.aTeam, match.team1),
    awayTeam: firstDefined(match.awayTeam, match.away, match.awayName, match.teamB, match.bTeam, match.team2),
    homeGoals: firstDefined(match.homeGoals, match.homeScore, match.goalsForHome, match.teamAGoals, null),
    awayGoals: firstDefined(match.awayGoals, match.awayScore, match.goalsForAway, match.teamBGoals, null),
    played: Boolean(match.played || match.completed || match.status === "played" || match.status === "complete" || match.status === "completed"),
    winner: firstDefined(match.winner, match.winnerId, match.wonBy, match.resultWinner, null),
  };
  return Object.fromEntries(Object.entries(out).filter(([, value]) => typeof value !== "undefined"));
}

function extractMatches(source = {}) {
  const candidates = [source.matches, source.fixtures, source.schedule, source.matchOutcomes].filter(Array.isArray);
  for (const candidate of candidates) {
    const compact = candidate.map(normaliseMatchSnapshot).filter(Boolean);
    if (compact.length) return compact;
  }
  return [];
}

function compactActiveMatch(source = {}) {
  const active = source.activeMatch && typeof source.activeMatch === "object" ? source.activeMatch : source;
  const out = {
    matchId: firstDefined(active.matchId, active.currentMatchId, active.id, source.matchId, source.currentMatchId),
    userTeamName: firstDefined(active.userTeamName, active.teamName, active.team, source.teamName, source.team),
    opponentTeamName: firstDefined(active.opponentTeamName, active.opponent, active.awayTeam, source.opponent),
    userGoals: firstDefined(active.userGoals, active.userScore, source.userGoals, source.userScore),
    opponentGoals: firstDefined(active.opponentGoals, active.opponentScore, source.opponentGoals, source.opponentScore),
    userPensTaken: firstDefined(active.userPensTaken, source.userPensTaken),
    opponentPensTaken: firstDefined(active.opponentPensTaken, source.opponentPensTaken),
    currentTurn: firstDefined(active.currentTurn, source.currentTurn),
    currentPenaltyNumber: firstDefined(active.currentPenaltyNumber, source.currentPenaltyNumber),
    suddenDeath: firstDefined(active.suddenDeath, source.suddenDeath, false),
    penaltyMarkers: firstDefined(active.penaltyMarkers, source.penaltyMarkers, []),
    lastShotResult: firstDefined(active.lastShotResult, source.lastShotResult),
  };
  const cleaned = Object.fromEntries(Object.entries(out).filter(([, value]) => typeof value !== "undefined" && value !== null));
  return Object.keys(cleaned).length ? cleaned : undefined;
}

function compactRuntimeSnapshot(source = {}) {
  const runtime = source.runtimeSnapshot && typeof source.runtimeSnapshot === "object" ? source.runtimeSnapshot : source;
  const out = {
    currentMatchId: firstDefined(runtime.currentMatchId, runtime.currentMatch?.id),
    matchIndex: firstDefined(runtime.matchIndex, runtime.currentMatchNumber),
    currentTurn: runtime.currentTurn,
    currentPenaltyNumber: runtime.currentPenaltyNumber,
    matchStage: runtime.matchStage,
  };
  const cleaned = Object.fromEntries(Object.entries(out).filter(([, value]) => typeof value !== "undefined" && value !== null));
  return Object.keys(cleaned).length ? cleaned : undefined;
}

function isTerminalCampaign(source = {}) {
  const phase = String(firstDefined(source.phase, source.round, source.matchStage, source.status, "") || "").trim().toLowerCase();
  if (source.exists === false) return true;
  return ["eliminated", "complete", "completed", "finished", "ended", "monday cup champion", "champion", "runner-up", "runner up", "third-place", "third place"].includes(phase);
}

function cleanCurrentCampaign(source = {}) {
  const cleaned = {
    exists: firstDefined(source.exists, true),
    teamName: firstDefined(source.teamName, source.team, source.selectedTeam),
    opponent: firstDefined(source.opponent, source.opponentTeamName, source.awayTeam),
    phase: firstDefined(source.phase, source.round, source.matchStage),
    matchId: firstDefined(source.matchId, source.currentMatchId, source.currentMatch?.id),
    gameScore: firstDefined(source.gameScore, source.userScore, source.campaignScore, source.score?.gameScore, 0),
    cupRun: source.cupRun,
    score: source.score && typeof source.score === "object" ? source.score : undefined,
    usedGoldenUpgrade: typeof source.usedGoldenUpgrade === "boolean" ? source.usedGoldenUpgrade : inferUsedGoldenUpgrade(source),
    matches: extractMatches(source),
    activeMatch: compactActiveMatch(source),
    runtimeSnapshot: compactRuntimeSnapshot(source),
    updatedAt: firstDefined(source.updatedAt, Date.now()),
  };
  return Object.fromEntries(Object.entries(cleaned).filter(([, value]) => typeof value !== "undefined" && value !== null));
}

function cleanConsumables(source = {}) {
  return { goldenTicket: { quantity: number(source?.goldenTicket?.quantity ?? source?.goldenTicket?.count ?? source?.goldenTicket?.qty, 0) } };
}

function cleanFeedback(source = {}) {
  const ratings = Array.isArray(source.ratings) ? source.ratings : [];
  const latest = source.latestRating || source.latest || ratings[ratings.length - 1] || null;
  const latestRating = latest && typeof latest === "object" ? {
    id: String(latest.id || latest.createdAt || Date.now()),
    stars: number(latest.stars ?? latest.rating, 0),
    rating: number(latest.rating ?? latest.stars, 0),
    comment: String(latest.comment || "").slice(0, 280),
    promptType: latest.promptType || source.lastPromptType || "prompt1",
    campaignsCompleted: number(latest.campaignsCompleted, 0),
    cupsWon: number(latest.cupsWon, 0),
    createdAt: latest.createdAt || source.lastSubmittedAt || Date.now(),
  } : null;
  return {
    prompt1Shown: Boolean(source.prompt1Shown),
    prompt2Shown: Boolean(source.prompt2Shown),
    hasSubmitted: Boolean(source.hasSubmitted || latestRating),
    latestRating: latestRating && latestRating.rating >= 1 && latestRating.rating <= 5 ? latestRating : null,
    lastPromptType: source.lastPromptType || latestRating?.promptType || null,
    lastPromptedAt: source.lastPromptedAt || null,
    lastSubmittedAt: source.lastSubmittedAt || latestRating?.createdAt || null,
  };
}

const STICKER_DELETE_KEYS = new Set(["firstPlayedAt", "lastPlayedAt", "lastStickerProgressAt"]);
function cleanStickers(source = {}) {
  const out = {};
  for (const [team, record] of Object.entries(source || {})) {
    if (!record || typeof record !== "object") continue;
    out[team] = Object.fromEntries(Object.entries(record).filter(([key]) => !STICKER_DELETE_KEYS.has(key)));
  }
  return out;
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

function leaderboardPatch(data) {
  const setFields = {};
  const deletePaths = LEADERBOARD_DELETE_FIELDS.filter((path) => fieldExists(data, path));
  const podium = normalisePodium(data.podium, data.phase, data.round, data.finish);
  if (data.podium !== podium) setFields.podium = podium;
  if (typeof data.usedGoldenUpgrade !== "boolean") setFields.usedGoldenUpgrade = inferUsedGoldenUpgrade(data);
  return { setFields, deletePaths };
}

function userPatch(data) {
  const setFields = {};
  const deletePaths = [];

  if (data.bestCampaign && typeof data.bestCampaign === "object") {
    setFields.bestCampaign = cleanBestCampaign(data.bestCampaign);
  }

  if (data.currentCampaign && typeof data.currentCampaign === "object") {
    if (isTerminalCampaign(data.currentCampaign)) deletePaths.push("currentCampaign");
    else setFields.currentCampaign = cleanCurrentCampaign(data.currentCampaign);
  }

  if (data.consumables && typeof data.consumables === "object") setFields.consumables = cleanConsumables(data.consumables);
  if (data.feedback && typeof data.feedback === "object") setFields.feedback = cleanFeedback(data.feedback);
  if (data.stickers && typeof data.stickers === "object") setFields.stickers = cleanStickers(data.stickers);

  if (fieldExists(data, "profile.usernameLower")) deletePaths.push("profile.usernameLower");
  if (fieldExists(data, "usernameLower")) deletePaths.push("usernameLower");
  if (fieldExists(data, "nicknameLower")) deletePaths.push("nicknameLower");

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
