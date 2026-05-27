export const RESULT_STATUS = Object.freeze({
  GROUP_WIN: "groupWin",
  GROUP_LOSS: "groupLoss",
  GROUP_DRAW: "groupDraw",
  QUALIFIED: "qualified",
  ELIMINATED: "eliminated",
  KNOCKOUT_WIN: "knockoutWin",
  THIRD_PLACE_PENDING: "thirdPlace",
  THIRD_PLACE: "third",
  FOURTH_PLACE: "fourth",
  RUNNER_UP: "runnerUp",
  CHAMPION: "champion",
});

export const RESULT_STATUS_ALIAS = Object.freeze({
  "runner-up": RESULT_STATUS.RUNNER_UP,
  runnerup: RESULT_STATUS.RUNNER_UP,
  second: RESULT_STATUS.RUNNER_UP,
  bronze: RESULT_STATUS.THIRD_PLACE,
  thirdplace: RESULT_STATUS.THIRD_PLACE,
  "third-place": RESULT_STATUS.THIRD_PLACE,
  thirdPlace: RESULT_STATUS.THIRD_PLACE_PENDING,
});

export const PODIUM_BADGE_MODE = Object.freeze({
  CHAMPION: RESULT_STATUS.CHAMPION,
  RUNNER_UP: RESULT_STATUS.RUNNER_UP,
  THIRD: RESULT_STATUS.THIRD_PLACE,
});

export const TERMINAL_RESULT_STATUSES = new Set([
  RESULT_STATUS.ELIMINATED,
  RESULT_STATUS.CHAMPION,
  RESULT_STATUS.RUNNER_UP,
  RESULT_STATUS.THIRD_PLACE,
  RESULT_STATUS.FOURTH_PLACE,
]);

export const THIRD_PLACE_RESULT_STATUSES = new Set([
  RESULT_STATUS.THIRD_PLACE,
  RESULT_STATUS.THIRD_PLACE_PENDING,
  "third-place",
  "bronze",
]);

export function normalizeResultStatus(status) {
  if (!status) return "";
  const value = String(status);
  return RESULT_STATUS_ALIAS[value] || RESULT_STATUS_ALIAS[value.toLowerCase()] || value;
}

export function isTerminalResultStatus(status) {
  return TERMINAL_RESULT_STATUSES.has(normalizeResultStatus(status));
}

export function isThirdPlaceResultStatus(status) {
  const normalised = normalizeResultStatus(status);
  return normalised === RESULT_STATUS.THIRD_PLACE || normalised === RESULT_STATUS.THIRD_PLACE_PENDING;
}

export function isRunnerUpStatus(status) {
  return normalizeResultStatus(status) === RESULT_STATUS.RUNNER_UP;
}

export function isChampionStatus(status) {
  return normalizeResultStatus(status) === RESULT_STATUS.CHAMPION;
}

export function isThirdPlacePendingStatus(status) {
  return normalizeResultStatus(status) === RESULT_STATUS.THIRD_PLACE_PENDING;
}
