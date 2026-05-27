import {
  PODIUM_BADGE_MODE,
  RESULT_STATUS,
  isThirdPlaceResultStatus,
  normalizeResultStatus,
} from "./resultStatus.js";

function textIncludesThirdPlace(value) {
  return /third\s*place|3rd\s*place|bronze|m103|third[-_\s]*place[-_\s]*play[-_\s]*off|third[-_\s]*place[-_\s]*playoff/i.test(String(value || ""));
}

function getFixtureMatchNo(fixture = {}, result = {}) {
  const value = result?.matchNo ?? fixture?.matchNo;
  const number = Number(value);
  return Number.isFinite(number) ? number : value;
}

function userWonResult(result = {}, userWon = undefined) {
  return userWon ?? result?.userWon ?? result?.won;
}

export function isThirdPlacePlayoff({ result = null, fixture = null, stageLabel = "" } = {}) {
  const status = normalizeResultStatus(result?.status);
  if (status && !isThirdPlaceResultStatus(status)) return false;

  const matchNo = getFixtureMatchNo(fixture, result);
  if (Number(matchNo) === 103) return true;

  const values = [
    stageLabel,
    fixture?.id,
    fixture?.code,
    fixture?.name,
    fixture?.title,
    fixture?.label,
    fixture?.round,
    fixture?.roundName,
    fixture?.stage,
    fixture?.stageName,
    fixture?.phase,
    fixture?.type,
    fixture?.matchType,
    fixture?.matchNo,
    result?.id,
    result?.code,
    result?.name,
    result?.title,
    result?.label,
    result?.round,
    result?.roundName,
    result?.stage,
    result?.stageName,
    result?.phase,
    result?.type,
    result?.matchType,
    result?.matchNo,
  ];

  return values.some(textIncludesThirdPlace);
}

export function getUserFinishStatus({ result = null, fixture = null, stageLabel = "", podium = null, team = null, userWon = undefined, matchNo = undefined } = {}) {
  const status = normalizeResultStatus(result?.status);
  const resolvedMatchNo = Number(matchNo ?? result?.matchNo ?? fixture?.matchNo);
  const didWin = userWonResult(result, userWon);
  const isFinal = resolvedMatchNo === 104;
  const isThirdPlace = resolvedMatchNo === 103 || isThirdPlacePlayoff({ result, fixture, stageLabel });

  // Podium positions are only converted into user-facing finish statuses on the
  // actual placement fixtures. This prevents the runner-up / champion / third
  // badges from appearing early during semi-final setup.
  if (isFinal && team && podium?.winner === team) return RESULT_STATUS.CHAMPION;
  if (isFinal && team && podium?.champion === team) return RESULT_STATUS.CHAMPION;
  if (isFinal && team && (podium?.runnerUp === team || podium?.runnerup === team || podium?.second === team)) return RESULT_STATUS.RUNNER_UP;
  if (isThirdPlace && team && (podium?.third === team || podium?.thirdPlace === team)) return RESULT_STATUS.THIRD_PLACE;

  if (isFinal) {
    if (status === RESULT_STATUS.CHAMPION || status === RESULT_STATUS.RUNNER_UP) return status;
    return didWin ? RESULT_STATUS.CHAMPION : RESULT_STATUS.RUNNER_UP;
  }

  if (resolvedMatchNo === 103) {
    if (status === RESULT_STATUS.THIRD_PLACE || status === RESULT_STATUS.FOURTH_PLACE) return status;
    return didWin ? RESULT_STATUS.THIRD_PLACE : RESULT_STATUS.FOURTH_PLACE;
  }

  if ((resolvedMatchNo === 101 || resolvedMatchNo === 102) && didWin === false) return RESULT_STATUS.THIRD_PLACE_PENDING;
  if (status === RESULT_STATUS.FOURTH_PLACE) return status;
  if (status === RESULT_STATUS.THIRD_PLACE && isThirdPlace) return RESULT_STATUS.THIRD_PLACE;
  if (didWin === true) return RESULT_STATUS.KNOCKOUT_WIN;

  return status || RESULT_STATUS.ELIMINATED;
}

export function getPodiumBadgeMode({ result = null, fixture = null, stageLabel = "", podium = null, team = null } = {}) {
  const matchNo = Number(getFixtureMatchNo(fixture, result));
  const finishStatus = getUserFinishStatus({ result, fixture, stageLabel, podium, team });

  if (matchNo === 104 && finishStatus === RESULT_STATUS.CHAMPION) return PODIUM_BADGE_MODE.CHAMPION;
  if (matchNo === 104 && finishStatus === RESULT_STATUS.RUNNER_UP) return PODIUM_BADGE_MODE.RUNNER_UP;
  if (matchNo === 103 && finishStatus === RESULT_STATUS.THIRD_PLACE) return PODIUM_BADGE_MODE.THIRD;

  return null;
}

export function isTerminalShareResult({ result = null, fixture = null, stageLabel = "", podium = null, team = null } = {}) {
  if (!result) return false;

  const matchNo = Number(getFixtureMatchNo(fixture, result));
  const finishStatus = getUserFinishStatus({ result, fixture, stageLabel, podium, team });

  if (matchNo === 104) {
    return finishStatus === RESULT_STATUS.CHAMPION || finishStatus === RESULT_STATUS.RUNNER_UP;
  }

  if (matchNo === 103) {
    return finishStatus === RESULT_STATUS.THIRD_PLACE;
  }

  return false;
}
