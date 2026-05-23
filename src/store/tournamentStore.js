import { blankTable, buildSchedule } from "../logic/tournament.js";

const createCampaignId = () => `campaign-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const createNavigationState = () => ({
  screen: "home",
  drawer: null,
  menuOpen: false,
});

const createViewState = () => ({
  fixtureView: "group",
  standingsView: "group",
  selectedGroup: "A",
});

const createCampaignState = () => ({
  campaignId: createCampaignId(),
  team: null,
  opponent: "",
  matchStage: "GROUP STAGE",
  userForm: [],
  podium: {},
});

const createMatchState = () => ({
  score: [0, 0],
  result: null,
  modalDismissed: false,
  currentKnockoutMatch: null,
});

const createTournamentDataState = () => ({
  table: blankTable(),
  schedule: buildSchedule(),
  knockoutFixtures: [],
});

export const createInitialTournamentState = () => ({
  navigation: createNavigationState(),
  views: createViewState(),
  campaign: createCampaignState(),
  match: createMatchState(),
  tournament: createTournamentDataState(),
});

export const flattenTournamentState = (state) => ({
  ...state.navigation,
  ...state.views,
  ...state.campaign,
  score: state.match.score,
  matchResult: state.match.result,
  modalDismissed: state.match.modalDismissed,
  currentKnockoutMatch: state.match.currentKnockoutMatch,
  ...state.tournament,
});

export const tournamentActions = {
  patch: (patch) => ({ type: "patch", patch }),
  hydrate: (state) => ({ type: "hydrate", state }),
  patchDomains: (patch) => ({ type: "patch-domains", patch }),
  toggleMenu: () => ({ type: "toggle-menu" }),
  closeMenu: () => ({ type: "patch-domains", patch: { navigation: { menuOpen: false } } }),
  reset: () => ({ type: "reset" }),
  resetToHostSelect: () => ({ type: "reset-to-host-select" }),
};

const flatStateDomains = {
  screen: "navigation",
  drawer: "navigation",
  menuOpen: "navigation",
  fixtureView: "views",
  standingsView: "views",
  selectedGroup: "views",
  campaignId: "campaign",
  team: "campaign",
  opponent: "campaign",
  matchStage: "campaign",
  userForm: "campaign",
  podium: "campaign",
  score: "match",
  modalDismissed: "match",
  currentKnockoutMatch: "match",
  table: "tournament",
  schedule: "tournament",
  knockoutFixtures: "tournament",
};

function normalisePatch(patch = {}) {
  const domainPatch = {};

  Object.entries(patch).forEach(([key, value]) => {
    if (["navigation", "views", "campaign", "match", "tournament"].includes(key)) {
      domainPatch[key] = { ...(domainPatch[key] || {}), ...value };
      return;
    }

    if (key === "matchResult") {
      domainPatch.match = { ...(domainPatch.match || {}), result: value };
      return;
    }

    const domain = flatStateDomains[key];
    if (domain) domainPatch[domain] = { ...(domainPatch[domain] || {}), [key]: value };
  });

  return domainPatch;
}

function mergeDomains(state, patch = {}) {
  const next = { ...state };
  Object.entries(patch).forEach(([domain, value]) => {
    next[domain] = { ...next[domain], ...value };
  });
  return next;
}

export function tournamentReducer(state, action) {
  switch (action.type) {
    case "hydrate":
      return action.state || state;
    case "patch":
      return mergeDomains(state, normalisePatch(action.patch));
    case "patch-domains":
      return mergeDomains(state, action.patch);
    case "toggle-menu":
      return mergeDomains(state, { navigation: { menuOpen: !state.navigation.menuOpen } });
    case "reset":
      return createInitialTournamentState();
    case "reset-to-host-select":
      return mergeDomains(createInitialTournamentState(), { navigation: { screen: "hosts" } });
    default:
      return state;
  }
}
