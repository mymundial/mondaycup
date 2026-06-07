const CAMPAIGN_STORAGE_KEY = "mondaycup-campaign-state:v1";

function canUseLocalStorage() {
  return typeof window !== "undefined" && !!window.localStorage;
}

function safeParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function sanitiseNavigation(navigation = {}) {
  return {
    screen: "match",
    drawer: null,
    menuOpen: false,
    ...navigation,
    drawer: null,
    menuOpen: false,
  };
}

export function buildPersistedCampaignState(state) {
  if (!state?.campaign?.team) return null;

  return {
    version: 1,
    savedAt: new Date().toISOString(),
    state: {
      ...state,
      navigation: sanitiseNavigation(state.navigation),
    },
  };
}

export function saveCampaignState(state) {
  if (!canUseLocalStorage()) return;
  const payload = buildPersistedCampaignState(state);
  if (!payload) return;
  window.localStorage.setItem(CAMPAIGN_STORAGE_KEY, JSON.stringify(payload));
}

export function loadCampaignState() {
  if (!canUseLocalStorage()) return null;
  const payload = safeParse(window.localStorage.getItem(CAMPAIGN_STORAGE_KEY));
  if (!payload?.state?.campaign?.team) return null;

  return {
    ...payload.state,
    navigation: sanitiseNavigation(payload.state.navigation),
  };
}

export function loadCampaignSummary() {
  if (!canUseLocalStorage()) return null;
  const payload = safeParse(window.localStorage.getItem(CAMPAIGN_STORAGE_KEY));
  const saved = payload?.state;
  const team = saved?.campaign?.team;
  if (!team) return null;

  const matchStage = saved?.campaign?.matchStage || "GROUP STAGE";
  const opponent = saved?.campaign?.opponent || "NEXT OPPONENT";
  const result = saved?.match?.result;

  return {
    team,
    opponent,
    matchStage,
    savedAt: payload.savedAt || null,
    status: result?.status || null,
  };
}

export function clearSavedCampaign() {
  if (!canUseLocalStorage()) return;
  window.localStorage.removeItem(CAMPAIGN_STORAGE_KEY);
}
