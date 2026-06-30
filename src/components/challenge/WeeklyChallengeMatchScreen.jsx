import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { collection, doc, getDoc, getDocs, orderBy, query, serverTimestamp, setDoc } from "firebase/firestore";
import { FullPitchExtensionBackground, Shell } from "../layout/Layout.jsx";
import { ControlOverlay, Pitch } from "../match/FootballGameView.jsx";
import { Flag } from "../shared.jsx";
import { teamToGameTeam } from "../../logic/matchPresentation.js";
import {
  DEFAULT_ASSETS,
  GAME,
  PHASE,
  clamp,
  getDirection,
  pointForDirection,
  resolvePenalty,
  playSound,
} from "../../logic/penaltyEngine.js";
import {
  DEFAULT_ACCURACY_SWEEP_MS,
  PHASE_ACCURACY,
  POWER_SWEEP_MS,
  accuracyKeeperReadChanceForValue,
  accuracyOutcomeForValue,
  accuracySpeedForPower,
  displayedMeterValue,
  getAccuracyTargetZone,
  getPowerTargetZone,
} from "../../logic/shotMeter.js";
import { MC_SELECTION_LAYOUT } from "../../styles/theme.js";
import { ASSETS } from "../../data/assets.js";
import { auth, db } from "../../firebase.js";
import { createChallengeShareBlob } from "../../utils/challengeShareCanvas.js";
import { reserveShareWindow, shareOrDownloadResult } from "../../utils/shareExport.js";

const MemoFullPitchExtensionBackground = memo(function MemoFullPitchExtensionBackground() {
  return <FullPitchExtensionBackground />;
});

const MemoPitch = memo(Pitch);

function teamTickerStyle(team) {
  return { background: team.primaryColour, color: team.textColour };
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="3.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M6 6L18 18" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function ChallengeTopBar({ onExit }) {
  return (
    <section
      className="relative z-[1000] flex shrink-0 items-center justify-center overflow-visible px-6 text-[#F5F1E8] shadow-[0_2px_8px_rgba(0,0,0,0.16)]"
      style={{ height: MC_SELECTION_LAYOUT.topBarHeight, background: "#063B25" }}
    >
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[0] bg-[#063B25]" style={{ height: MC_SELECTION_LAYOUT.topBarHeight }} aria-hidden="true" />
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[0] bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" style={{ height: MC_SELECTION_LAYOUT.topBarHeight }} aria-hidden="true" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" aria-hidden="true" />
      <div className="absolute left-3 top-1/2 z-[1001] grid h-9 w-9 -translate-y-1/2 place-items-center" aria-hidden="true">
        <img
          src={ASSETS.branding.mondayLogo}
          alt=""
          className="h-9 w-9 object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.28)]"
          draggable={false}
        />
      </div>
      <h2
        className="relative z-[1] home-copy-bold text-center text-[clamp(25px,6.1vw,34px)] uppercase leading-none text-[#F5F1E8]"
        style={{ letterSpacing: "0.035em", textShadow: "0 3px 0 rgba(0,0,0,0.18)" }}
      >
        CHALLENGE
      </h2>
      <button
        type="button"
        onClick={onExit}
        className="absolute right-3 top-1/2 z-[1001] flex h-9 w-9 -translate-y-1/2 items-center justify-center text-[#F5F1E8] drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)] active:scale-[0.96]"
        aria-label="Exit challenge"
      >
        <CloseIcon />
      </button>
    </section>
  );
}

function TeamFlag({ team, className = "h-[14px] w-[21px]" }) {
  if (team.flag) {
    return (
      <img
        src={team.flag}
        alt={`${team.name} flag`}
        className={`${className} inline-block shrink-0 rounded-[4px] border border-[#F7D117]/82 bg-[#F5F1E8] object-cover align-middle outline outline-[0.6px] outline-[#F7D117]/75 outline-offset-0`}
        style={{ boxShadow: "0 0 1.5px rgba(247,209,23,0.10), inset 0 0 0 0.7px rgba(3,27,18,0.24)", filter: "none" }}
        draggable={false}
      />
    );
  }
  return <Flag team={team.name} className={className} />;
}

const SCOREBOARD_LABEL_TRACKING = "0.11em";
const SCOREBOARD_LABEL_LEFT_BALANCE = `${0.11 + ((322 - 29) / 2048)}em`;

function DotMatrixLabelText({ children }) {
  const text = String(children || "");
  return (
    <span className="inline-flex items-center justify-center whitespace-nowrap leading-none">
      <span aria-hidden="true" className="inline-block shrink-0" style={{ width: SCOREBOARD_LABEL_LEFT_BALANCE }} />
      <span className="inline-block whitespace-nowrap leading-none" style={{ letterSpacing: SCOREBOARD_LABEL_TRACKING }}>
        {text}
      </span>
    </span>
  );
}

function ChallengeStreakMarkers({ score, failed = false }) {
  const goals = Math.max(0, Number.isFinite(score) ? score : 0);
  const markers = Array.from({ length: goals + 1 }, (_, index) => {
    if (index < goals) return "goal";
    return failed ? "miss" : "next";
  });
  const dotSize = "clamp(4px,1.15vw,6px)";
  const gapSize = "clamp(2px,0.72vw,3px)";

  return (
    <div className="inline-flex w-max max-w-full flex-wrap justify-center overflow-visible" style={{ gap: gapSize }} aria-label={`${goals} goals scored`}>
      {markers.map((marker, index) => {
        const markerClass = marker === "goal" ? "bg-green-500" : marker === "miss" ? "bg-red-500" : "bg-[#F7D117]";
        const markerShadow = marker === "miss"
          ? "0 0 5px rgba(239,68,68,0.72), 0 0 10px rgba(239,68,68,0.25)"
          : marker === "goal"
            ? "0 0 5px rgba(34,197,94,0.72), 0 0 10px rgba(34,197,94,0.25)"
            : "0 0 2.5px rgba(247,209,23,0.13)";
        return (
          <span
            key={index}
            data-share-marker-dot="true"
            className={`shrink-0 rounded-full ${markerClass}`}
            style={{ width: dotSize, height: dotSize, boxShadow: markerShadow, filter: "none" }}
          />
        );
      })}
    </div>
  );
}

function ChallengeScoreboard({ userTeam, opponentTeam, score, failedShot, ticker, tickerStyle }) {
  const scoreboardHeight = `calc((100dvh - ${MC_SELECTION_LAYOUT.topBarHeight}px) * ${MC_SELECTION_LAYOUT.scoreboardRatio})`;
  const tickerPercent = MC_SELECTION_LAYOUT.tickerRatio * 100;
  const crispLedStyle = { textShadow: "0 0 0.25px rgba(247,209,23,0.20), 0 0 2px rgba(247,209,23,0.10)", WebkitFontSmoothing: "antialiased", filter: "none" };
  const scoreboardLabelTextStyle = { textShadow: "0 0 0.25px rgba(247,209,23,0.20), 0 0 1.8px rgba(247,209,23,0.09)" };
  const tickerCopy = String(ticker || `${userTeam.name.toUpperCase()} TO SHOOT`).replace(/\s+/g, " ").trim();

  return (
    <section data-share-scoreboard="true" className="relative mt-0 shrink-0 overflow-visible bg-[#050505]" style={{ height: scoreboardHeight }}>
      <div data-share-scoreboard-main="true" className="relative overflow-hidden border-y border-[#F5F1E8]/18 bg-[#050505] shadow-[0_2px_8px_rgba(0,0,0,0.20)]" style={{ height: `${100 - tickerPercent}%` }}>
        <div
          className="pointer-events-none absolute left-[2px] right-[2px] top-[2px] bottom-[2px] opacity-50"
          style={{
            backgroundImage: "radial-gradient(circle at center, rgba(247,209,23,0.14) 0.72px, transparent 1.44px)",
            backgroundSize: "6px calc(100% / 12)",
            backgroundPosition: "center top",
            backgroundRepeat: "repeat",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.10),rgba(11,95,53,0.035),rgba(11,95,53,0.10))]" />
        <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(circle at center, rgba(247,209,23,0.095) 0%, rgba(247,209,23,0.045) 22%, rgba(247,209,23,0.016) 42%, transparent 68%)" }} />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]" />

        <div className="relative z-[1] flex h-full items-center px-[clamp(8px,3.5%,18px)] py-0">
          <div className="grid h-[88%] w-full grid-cols-[34px_minmax(0,1fr)_clamp(46px,14vw,70px)_minmax(0,1fr)_34px] grid-rows-[30%_45%_25%] items-center">
            <div data-normalise-stage-label="true" className="col-start-2 col-end-5 row-start-1 flex items-center justify-center">
              <div className="inline-flex min-h-[clamp(15px,1.95vh,20px)] max-w-full items-center justify-center rounded-[0.32rem] border border-[#F5F1E8]/22 bg-[#050505] px-[clamp(5px,1.45vw,9px)] py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
                <div className="led-text-glow font-led flex min-h-full items-center justify-center whitespace-nowrap text-center text-[clamp(5.8px,0.95vh,10px)] font-black uppercase leading-none text-[#F7D117]" style={{ fontFamily: "IntoDotMatrix, monospace", fontWeight: 900, ...scoreboardLabelTextStyle }}>
                  <DotMatrixLabelText>BEAT THE GOALIE</DotMatrixLabelText>
                </div>
              </div>
            </div>

            <div className="col-start-1 row-start-2 flex h-full items-center justify-center">
              <TeamFlag team={userTeam} className="h-[14px] w-[21px]" />
            </div>
            <div className="col-start-2 row-start-2 flex h-full min-w-0 items-center justify-center overflow-visible px-[clamp(8px,3vw,18px)]">
              <div className="led-text-glow font-led w-full text-center text-[clamp(16px,3.05dvh,32px)] font-normal leading-none tracking-tight text-[#F7D117]" style={crispLedStyle}>{userTeam.code}</div>
            </div>
            <div className="led-text-glow font-led col-start-3 row-start-2 flex h-full items-center justify-center text-[clamp(18px,3.25dvh,35px)] font-black leading-none tracking-normal text-[#F7D117] tabular-nums" style={crispLedStyle}>{score}</div>
            <div className="col-start-4 row-start-2 flex h-full min-w-0 items-center justify-center overflow-visible px-[clamp(8px,3vw,18px)]">
              <div className="led-text-glow font-led w-full text-center text-[clamp(16px,3.05dvh,32px)] font-normal leading-none tracking-tight text-[#F7D117]" style={crispLedStyle}>{opponentTeam.code}</div>
            </div>
            <div className="col-start-5 row-start-2 flex h-full items-center justify-center">
              <TeamFlag team={opponentTeam} className="h-[14px] w-[21px]" />
            </div>

            <div className="relative z-[1] col-start-2 col-end-5 row-start-3 flex h-full min-w-0 items-center justify-center overflow-visible">
              <span className="flex min-h-[clamp(12px,1.65vh,17px)] min-w-0 items-center justify-center overflow-visible leading-none"><ChallengeStreakMarkers score={score} failed={failedShot} /></span>
            </div>
          </div>
        </div>
      </div>

      <div
        data-share-flash="true"
        className="relative flex w-full items-center justify-center overflow-visible px-[3%] text-center uppercase tracking-[0.085em]"
        style={{
          height: `${tickerPercent}%`,
          marginTop: 0,
          boxSizing: "border-box",
          minHeight: 0,
          fontFamily: '"SportsDINBold", "SportsDINRegular", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontWeight: 900,
          lineHeight: 1,
          ...tickerStyle,
        }}
      >
        <span
          className="relative z-[1] block max-w-[94%] overflow-hidden truncate whitespace-nowrap text-center leading-none [text-wrap:nowrap]"
          style={{ fontSize: "clamp(13px,1.75dvh,21px)", lineHeight: 1, textOverflow: "ellipsis", display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}
        >
          {tickerCopy}
        </span>
      </div>
    </section>
  );
}

const MemoChallengeTopBar = memo(ChallengeTopBar);
const MemoChallengeScoreboard = memo(ChallengeScoreboard);

function MiniTickIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M5.5 12.3l4.15 4.15L18.75 7.35" stroke="currentColor" strokeWidth="2.85" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniBackIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M15.5 4.75L8.25 12l7.25 7.25" stroke="currentColor" strokeWidth="2.85" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MiniXIcon({ className = "h-5 w-5" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M6.5 6.5L17.5 17.5" stroke="currentColor" strokeWidth="2.85" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17.5 6.5L6.5 17.5" stroke="currentColor" strokeWidth="2.85" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const CHALLENGE_LEADERBOARD_GRID = "42px minmax(0,1fr) 72px 46px";
const CHALLENGE_LEADERBOARD_ROW_TEXT_CLASS = "home-copy-bold text-[11px] uppercase leading-none tracking-[0.02em]";
const CHALLENGE_SHOT_RESULT_DELAY_MS = 150;
const CHALLENGE_SHOT_RESULT_VOLUME = 0.5;
const CHALLENGE_ID = "beat-the-goalie-cape-verde";
const CHALLENGE_LOCAL_LEADERBOARD_KEY = "mondayCup.weeklyChallenge.beatTheGoalie.localLeaderboardRows";
const CHALLENGE_LEADERBOARD_SIZE = 5;

function placeholderChallengeRows(count = CHALLENGE_LEADERBOARD_SIZE, startRank = 1) {
  return Array.from({ length: count }, (_, index) => ({
    id: `placeholder-${startRank + index}`,
    rank: startRank + index,
    username: "---",
    team: null,
    score: null,
    isPlaceholder: true,
  }));
}

function displayChallengeUsername(username) {
  return String(username || "GUEST").toUpperCase().slice(0, 10);
}

function safeChallengeScore(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.floor(parsed)) : 0;
}

function challengeTimestampMs(value) {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  if (Number.isFinite(Number(value))) return Number(value);
  if (Number.isFinite(Number(value?.seconds))) {
    return Number(value.seconds) * 1000 + Math.floor(Number(value.nanoseconds || 0) / 1000000);
  }
  const parsed = Date.parse(String(value));
  return Number.isFinite(parsed) ? parsed : 0;
}

function betterChallengeLeaderboardEntry(existingEntry, nextEntry) {
  if (!existingEntry) return nextEntry;
  if (!nextEntry) return existingEntry;
  const existingScore = safeChallengeScore(existingEntry.score);
  const nextScore = safeChallengeScore(nextEntry.score);
  if (nextScore > existingScore) return { ...nextEntry, score: nextScore };
  if (nextScore === existingScore && Number(nextEntry.createdAt || 0) < Number(existingEntry.createdAt || 0)) return { ...nextEntry, score: nextScore };
  return { ...existingEntry, score: existingScore };
}

function normaliseChallengeLeaderboardRows(rows = []) {
  const mappedRows = rows
    .map((row, index) => {
      const score = safeChallengeScore(row?.score);
      const username = displayChallengeUsername(row?.username);
      const teamName = row?.teamName || row?.team?.name || "";
      const team = teamName ? teamToGameTeam(teamName) : null;
      const rawUid = row?.uid || row?.userId || "";
      const rawId = String(row?.id || (rawUid ? `${CHALLENGE_ID}-${rawUid}` : `local-${index}`));
      const isGuestEntry = username === "GUEST" && (rawId.startsWith(`${CHALLENGE_ID}-guest`) || row?.localOnly !== false);
      const id = isGuestEntry ? `${CHALLENGE_ID}-guest` : rawId;
      return {
        id,
        uid: rawUid || null,
        challengeId: row?.challengeId || CHALLENGE_ID,
        username,
        teamName: team?.name || teamName || null,
        team,
        score,
        createdAt: challengeTimestampMs(row?.createdAt) || challengeTimestampMs(row?.updatedAt),
        updatedAt: challengeTimestampMs(row?.updatedAt),
        localOnly: row?.localOnly !== false,
      };
    })
    .filter((row) => row.challengeId === CHALLENGE_ID && Number.isFinite(row.score));

  const bestByEntryId = new Map();
  mappedRows.forEach((row) => {
    const existing = bestByEntryId.get(row.id);
    bestByEntryId.set(row.id, betterChallengeLeaderboardEntry(existing, row));
  });

  return Array.from(bestByEntryId.values())
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return (a.createdAt || 0) - (b.createdAt || 0);
    })
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

function readChallengeLocalLeaderboardRows() {
  if (typeof window === "undefined" || !window.localStorage) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CHALLENGE_LOCAL_LEADERBOARD_KEY) || "[]");
    return normaliseChallengeLeaderboardRows(Array.isArray(parsed) ? parsed : []);
  } catch {
    return [];
  }
}

function writeChallengeLocalLeaderboardRows(rows = []) {
  if (typeof window === "undefined" || !window.localStorage) return;
  const compactRows = normaliseChallengeLeaderboardRows(rows).slice(0, 50).map((row) => ({
    id: row.id,
    challengeId: CHALLENGE_ID,
    username: row.username,
    teamName: row.team?.name || row.teamName,
    score: row.score,
    createdAt: row.createdAt || Date.now(),
    localOnly: true,
  }));
  try {
    window.localStorage.setItem(CHALLENGE_LOCAL_LEADERBOARD_KEY, JSON.stringify(compactRows));
  } catch {}
}

function saveChallengeLocalLeaderboardEntry(entry) {
  const existingRows = readChallengeLocalLeaderboardRows();
  const existingEntry = existingRows.find((row) => row.id === entry.id);
  const bestEntry = betterChallengeLeaderboardEntry(existingEntry, entry);
  const nextRows = normaliseChallengeLeaderboardRows([
    ...existingRows.filter((row) => row.id !== bestEntry.id),
    bestEntry,
  ]);
  writeChallengeLocalLeaderboardRows(nextRows);
  return nextRows;
}

function challengeScoresCollectionRef() {
  return collection(db, "challengeLeaderboards", CHALLENGE_ID, "scores");
}

function challengeScoreDocRef(userId) {
  return doc(db, "challengeLeaderboards", CHALLENGE_ID, "scores", userId);
}

function challengeLeaderboardRowFromDoc(item) {
  const data = item?.data?.() || {};
  const uid = data.uid || data.userId || item?.id || "";
  return {
    id: `${CHALLENGE_ID}-${uid}`,
    uid,
    userId: uid,
    challengeId: data.challengeId || CHALLENGE_ID,
    username: data.username || "GUEST",
    teamName: data.teamName || "",
    score: data.score,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    localOnly: false,
  };
}

async function readChallengeGlobalLeaderboardRows() {
  try {
    const snap = await getDocs(query(challengeScoresCollectionRef(), orderBy("score", "desc")));
    return normaliseChallengeLeaderboardRows(snap.docs.map(challengeLeaderboardRowFromDoc));
  } catch (error) {
    console.warn("Challenge leaderboard ordered load failed", error);
    try {
      const snap = await getDocs(challengeScoresCollectionRef());
      return normaliseChallengeLeaderboardRows(snap.docs.map(challengeLeaderboardRowFromDoc));
    } catch (fallbackError) {
      console.warn("Challenge leaderboard load failed", fallbackError);
      return [];
    }
  }
}

async function saveChallengeGlobalLeaderboardEntry(entry, userId) {
  if (!userId) return null;
  const entryRef = challengeScoreDocRef(userId);
  const existingSnap = await getDoc(entryRef).catch((error) => {
    console.warn("Challenge leaderboard existing score load failed", error);
    return null;
  });
  const existingEntry = existingSnap?.exists?.() ? normaliseChallengeLeaderboardRows([challengeLeaderboardRowFromDoc(existingSnap)])[0] : null;
  const nextEntry = {
    ...entry,
    id: `${CHALLENGE_ID}-${userId}`,
    uid: userId,
    userId,
    localOnly: false,
  };
  const bestEntry = betterChallengeLeaderboardEntry(existingEntry, nextEntry);
  if (existingEntry && safeChallengeScore(existingEntry.score) >= safeChallengeScore(nextEntry.score)) {
    return existingEntry;
  }

  const writePayload = {
    challengeId: CHALLENGE_ID,
    uid: userId,
    userId,
    username: displayChallengeUsername(nextEntry.username),
    teamName: nextEntry.team?.name || nextEntry.teamName || "",
    score: safeChallengeScore(nextEntry.score),
    localOnly: false,
    updatedAt: serverTimestamp(),
  };
  if (!existingSnap?.exists?.()) writePayload.createdAt = serverTimestamp();

  await setDoc(entryRef, writePayload, { merge: true });
  return bestEntry;
}

function buildChallengeLeaderboardDisplayRows(rows, currentEntry) {
  const existingEntry = rows.find((row) => row.id === currentEntry.id);
  const bestEntry = betterChallengeLeaderboardEntry(existingEntry, currentEntry);
  const rankedRows = normaliseChallengeLeaderboardRows([
    ...rows.filter((row) => row.id !== bestEntry.id),
    bestEntry,
  ]);
  const userRow = rankedRows.find((row) => row.id === bestEntry.id) || { ...bestEntry, rank: "--" };
  const topRows = rankedRows.slice(0, CHALLENGE_LEADERBOARD_SIZE);
  const placeholdersNeeded = Math.max(0, CHALLENGE_LEADERBOARD_SIZE - topRows.length);
  return {
    userRow,
    topRows: placeholdersNeeded ? [...topRows, ...placeholderChallengeRows(placeholdersNeeded, topRows.length + 1)] : topRows,
  };
}

function ChallengeLeaderboardSection({ title, children, className = "" }) {
  return (
    <div className={`rounded-[1.35rem] border border-[#F5F1E8]/14 bg-[#031B12]/24 p-2.5 text-[#F5F1E8] shadow-[inset_0_1px_0_rgba(245,241,232,0.06)] ${className}`}>
      {title && (
        <div className="mb-2 text-center home-copy-bold text-[clamp(15px,4.1vw,19px)] uppercase leading-none tracking-[0.11em] text-[#F5F1E8]">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}

function ChallengeLeaderboardHeader() {
  return (
    <div
      className="grid items-center gap-[3px] px-1.5 pb-1.5 text-center home-copy-bold text-[7px] uppercase leading-none tracking-[0.055em] text-[#F5F1E8]"
      style={{ gridTemplateColumns: CHALLENGE_LEADERBOARD_GRID }}
    >
      <span className="justify-self-center text-center">Rank</span>
      <span className="justify-self-start text-left">Username</span>
      <span className="justify-self-center text-center">Team</span>
      <span className="justify-self-center text-center">Score</span>
    </div>
  );
}

function challengeRowClass(row, isUser = false) {
  const numericRank = Number(row?.rank);
  const baseRowClass = "bg-[#052D1D]/68 text-[#F5F1E8]";
  if (isUser) return "border-[#F7D117]/82 bg-[#052D1D]/68 text-[#F5F1E8] ring-1 ring-[#F7D117]/34 shadow-[0_0_10px_rgba(247,209,23,0.16)]";
  if (numericRank === 1) return `${baseRowClass} border-[#B98224]/88 ring-1 ring-[#D99A2B]/26`;
  if (numericRank === 2) return `${baseRowClass} border-[#C8C8C8]/80 ring-1 ring-[#F5F1E8]/28`;
  if (numericRank === 3) return `${baseRowClass} border-[#CD7F32]/80 ring-1 ring-[#CD7F32]/30`;
  return "border-[#F5F1E8]/14 bg-[#052D1D]/68 text-[#F5F1E8] ring-1 ring-[#F5F1E8]/10";
}

function challengeRankClass(row, isUser = false) {
  const numericRank = Number(row?.rank);
  if (numericRank === 1) return "text-[#D99A2B]";
  if (numericRank === 2) return "text-[#C8C8C8]";
  if (numericRank === 3) return "text-[#CD7F32]";
  if (isUser) return "text-[#F7D117] drop-shadow-[0_0_5px_rgba(247,209,23,0.38)]";
  return "text-[#F5F1E8]";
}

function ChallengeLeaderboardRow({ row, isUser = false }) {
  const score = Number.isFinite(Number(row?.score)) ? Number(row.score) : null;
  return (
    <div
      className={`grid h-[40px] items-center gap-[3px] rounded-[1.05rem] border px-1.5 py-0 shadow-[0_6px_14px_rgba(0,0,0,0.10)] ${challengeRowClass(row, isUser)}`}
      style={{ gridTemplateColumns: CHALLENGE_LEADERBOARD_GRID }}
    >
      <div className={`flex h-full min-w-0 items-center justify-center text-center ${CHALLENGE_LEADERBOARD_ROW_TEXT_CLASS} ${challengeRankClass(row, isUser)}`}>#{row?.rank || "--"}</div>
      <div className={`flex h-full min-w-0 items-center justify-start justify-self-stretch text-left ${CHALLENGE_LEADERBOARD_ROW_TEXT_CLASS}`}>
        <span className={`block max-w-none whitespace-nowrap rounded-[0.55rem] pr-0 leading-none ${isUser ? "text-[#F7D117] drop-shadow-[0_0_5px_rgba(247,209,23,0.42)]" : "text-[#F5F1E8]"}`}>
          {displayChallengeUsername(row?.username)}
        </span>
      </div>
      <div className="grid h-full min-w-0 place-items-center justify-self-stretch text-center">
        {row?.team ? <TeamFlag team={row.team} className="h-[18px] w-[28px] rounded-[5px] object-cover" /> : <span className="grid h-[18px] w-[28px] place-items-center text-center home-copy-bold text-[11px] leading-none text-[#F5F1E8]/55">-</span>}
      </div>
      <div className={`flex h-full w-full min-w-0 items-center justify-center justify-self-stretch text-center ${CHALLENGE_LEADERBOARD_ROW_TEXT_CLASS} ${isUser ? "text-[#F7D117] drop-shadow-[0_0_5px_rgba(247,209,23,0.42)]" : "text-[#F7D117]"}`}>
        <span className="block w-full text-center tabular-nums leading-none">{score === null ? "--" : score}</span>
      </div>
    </div>
  );
}

function ChallengeLeaderboardTable({ rows, userRow }) {
  return (
    <>
      <ChallengeLeaderboardHeader />
      <div className="space-y-1.5">
        {rows.map((row, index) => (
          <ChallengeLeaderboardRow key={`${row.rank || index}-${row.username || "empty"}`} row={row} isUser={Boolean(userRow && row.id === userRow.id)} />
        ))}
      </div>
    </>
  );
}

function ChallengeEndModal({ score, userTeam, opponentTeam, onReplay, onExit, onChangeTeams, onShare, shareBusy = false }) {
  const resultButtonClass = "flex h-[44px] min-h-[44px] w-full min-w-0 items-center justify-center gap-1.5 rounded-[0.85rem] border border-[#F5F1E8]/45 bg-[#F7D117] px-2 text-center home-copy-bold text-[clamp(9px,2.45vw,11px)] font-black uppercase leading-none tracking-[0.07em] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.22),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 active:scale-[0.98]";
  const resultButtonsBoxClass = "mt-2 rounded-[1.35rem] border border-[#F5F1E8]/14 bg-[#031B12]/24 p-2.5 shadow-[inset_0_1px_0_rgba(245,241,232,0.06)]";
  const shareResultButtonClass = "flex h-[44px] min-h-[44px] w-full min-w-0 items-center justify-center rounded-[0.85rem] border border-[#F5F1E8]/45 bg-[#F7D117] px-3 text-center home-copy-bold text-[clamp(10px,2.7vw,12px)] font-black uppercase leading-none tracking-[0.08em] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.22),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 active:scale-[0.98]";
  const safeScore = safeChallengeScore(score);
  const currentUser = auth.currentUser;
  const username = currentUser?.displayName || currentUser?.email?.split("@")[0] || "GUEST";
  const [currentEntry] = useState(() => ({
    id: `${CHALLENGE_ID}-${currentUser?.uid || "guest"}`,
    challengeId: CHALLENGE_ID,
    username,
    teamName: userTeam?.name || "",
    team: userTeam,
    score: safeScore,
    createdAt: Date.now(),
    localOnly: !currentUser?.uid,
  }));
  const [leaderboardRows, setLeaderboardRows] = useState(() => (currentUser?.uid ? [] : readChallengeLocalLeaderboardRows()));

  useEffect(() => {
    let cancelled = false;

    async function syncChallengeLeaderboard() {
      const signedInUserId = currentUser?.uid || null;
      let localRows = [];

      if (signedInUserId) {
        await saveChallengeGlobalLeaderboardEntry(currentEntry, signedInUserId).catch((error) => {
          console.warn("Challenge leaderboard publish failed", error);
        });
      } else {
        localRows = saveChallengeLocalLeaderboardEntry(currentEntry);
      }

      const globalRows = await readChallengeGlobalLeaderboardRows();
      const nextRows = signedInUserId
        ? normaliseChallengeLeaderboardRows(globalRows)
        : normaliseChallengeLeaderboardRows([...globalRows, ...localRows]);

      if (!cancelled) setLeaderboardRows(nextRows);
    }

    syncChallengeLeaderboard();

    return () => {
      cancelled = true;
    };
  }, [currentEntry, currentUser?.uid]);

  const { userRow: myRankRow, topRows } = useMemo(
    () => buildChallengeLeaderboardDisplayRows(leaderboardRows, currentEntry),
    [currentEntry, leaderboardRows]
  );

  return (
    <div className="fixed inset-0 isolate flex items-center justify-center overflow-y-auto bg-[#031B12]/45 px-3 py-[max(14px,env(safe-area-inset-top))] backdrop-blur-[4px]" style={{ zIndex: 2147483647 }}>
      <div className="relative z-[1] flex w-full max-w-[408px] flex-col items-stretch">
        <div
          className="relative w-full overflow-hidden rounded-[2rem] border border-[#F5F1E8]/14 text-center text-[#F5F1E8] shadow-[0_24px_54px_rgba(0,0,0,0.36),inset_0_-2px_6px_rgba(0,0,0,0.08)]"
          style={{
            backgroundColor: "#0B5F35",
            backgroundImage: "linear-gradient(90deg, rgba(255,255,255,0.045) 0 12.5%, rgba(0,0,0,0.075) 12.5% 25%, rgba(255,255,255,0.035) 25% 37.5%, rgba(0,0,0,0.055) 37.5% 50%, rgba(255,255,255,0.04) 50% 62.5%, rgba(0,0,0,0.06) 62.5% 75%, rgba(255,255,255,0.03) 75% 87.5%, rgba(0,0,0,0.075) 87.5% 100%)",
            backgroundSize: "100% 100%",
          }}
        >
          <div className="pointer-events-none absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_18%_8%,rgba(247,209,23,0.10),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.035),rgba(0,0,0,0.09))]" aria-hidden="true" />
          <div className="relative p-3">
            <div className="mb-0 grid h-[58px] grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2">
              <div className="grid h-10 w-10 place-items-center justify-self-start">
                <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="h-10 w-10 object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.3)]" draggable={false} />
              </div>
              <div className="flex min-w-0 items-center justify-center self-center overflow-hidden">
                <div className="home-copy-bold flex min-w-0 items-center justify-center gap-2 whitespace-nowrap text-center text-[clamp(17px,4.9vw,24px)] uppercase leading-none tracking-[0.075em] text-[#F5F1E8]">
                  <span className="inline-flex items-center leading-none">BEAT THE</span>
                  <span className="inline-flex items-center justify-center leading-none" aria-hidden="true">
                    <TeamFlag team={opponentTeam || teamToGameTeam("Cape Verde")} className="h-[18px] w-[28px] rounded-[5px] object-cover" />
                  </span>
                  <span className="inline-flex items-center leading-none">GOALIE</span>
                </div>
              </div>
              <button type="button" onClick={onExit} aria-label="Close result" className="grid h-10 w-10 place-items-center justify-self-end text-[#F5F1E8] drop-shadow-[0_2px_5px_rgba(0,0,0,0.32)] active:scale-[0.96]">
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="max-h-[calc(100dvh-214px)] overflow-y-auto pb-0">
              <ChallengeLeaderboardSection title="MY RANKING">
                <div className="px-0 pb-0 pt-0">
                  <ChallengeLeaderboardHeader />
                  <ChallengeLeaderboardRow row={myRankRow} isUser />
                </div>
              </ChallengeLeaderboardSection>

              <div className="mt-2">
                <ChallengeLeaderboardSection title="TOP 5">
                  <ChallengeLeaderboardTable rows={topRows} userRow={myRankRow} />
                </ChallengeLeaderboardSection>
              </div>
            </div>

            <div className={resultButtonsBoxClass}>
              <button
                type="button"
                onClick={() => onShare?.({
                  score: safeScore,
                  rank: myRankRow?.rank || null,
                  username: myRankRow?.username || username,
                  userTeam,
                  opponentTeam,
                  challengeId: CHALLENGE_ID,
                })}
                disabled={shareBusy}
                className={`${shareResultButtonClass} mb-2 ${shareBusy ? "opacity-70" : ""}`}
                aria-label="Share result"
                title="Share result"
              >
                {shareBusy ? "SHARING..." : "SHARE RESULT"}
              </button>
              <div className="mb-2 text-center home-copy-bold text-[clamp(10px,2.7vw,12px)] uppercase leading-none tracking-[0.16em] text-[#F5F1E8]/78">
                REPLAY
              </div>
              <div className="grid grid-cols-3 items-center justify-items-stretch gap-2">
                <button type="button" onClick={onExit} className={resultButtonClass} aria-label="No" title="Exit">
                  <MiniXIcon className="h-5 w-5" />
                  <span className="sr-only">NO</span>
                </button>
                <button type="button" onClick={onChangeTeams} className={resultButtonClass} aria-label="Change team" title="Change team">
                  <span className="min-w-0 truncate">CHANGE TEAM</span>
                </button>
                <button type="button" onClick={onReplay} className={resultButtonClass} aria-label="Replay challenge" title="Replay">
                  <MiniTickIcon className="h-5 w-5" />
                  <span className="sr-only">YES</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default function WeeklyChallengeMatchScreen({ run, onExit, onChangeTeams }) {
  const teamName = run?.teamName || "Canada";
  const opponentName = run?.opponentName || "Cape Verde";
  const initialScore = Number.isFinite(run?.score) ? run.score : 0;

  const userTeam = useMemo(() => teamToGameTeam(teamName), [teamName]);
  const opponentTeam = useMemo(() => ({ ...teamToGameTeam(opponentName), code: run?.opponentCode || teamToGameTeam(opponentName).code }), [opponentName, run?.opponentCode]);
  const powerTargetZone = useMemo(() => getPowerTargetZone({}, null), []);
  const accuracyTargetZone = useMemo(() => getAccuracyTargetZone({}, null), []);

  const [scoreValue, setScoreValue] = useState(initialScore);
  const [challengeShareBusy, setChallengeShareBusy] = useState(false);
  const [ticker, setTicker] = useState(() => `${userTeam.name.toUpperCase()} TO SHOOT`);
  const [tickerTone, setTickerTone] = useState("user");
  const [challengeEnded, setChallengeEnded] = useState(false);
  const [failedShot, setFailedShot] = useState(false);
  const [phase, setPhase] = useState(PHASE.DIRECTION);
  const [selected, setSelected] = useState(() => getDirection("CM"));
  const [lockedDirection, setLockedDirection] = useState(null);
  const [lockedPower, setLockedPower] = useState(null);
  const [shot, setShot] = useState(null);
  const [powerValue, setPowerValue] = useState(0);
  const [powerCharging, setPowerCharging] = useState(false);
  const [accuracyValue, setAccuracyValue] = useState(0);
  const [accuracyRunning, setAccuracyRunning] = useState(false);
  const [accuracySweepMs, setAccuracySweepMs] = useState(DEFAULT_ACCURACY_SWEEP_MS);

  const powerValueRef = useRef(0);
  const powerFrameRef = useRef(null);
  const powerLastFrameRef = useRef(0);
  const powerDirectionRef = useRef(1);
  const powerFillRef = useRef(null);
  const accuracyFillRef = useRef(null);
  const accuracyValueRef = useRef(0);
  const accuracyFrameRef = useRef(null);
  const accuracyLastFrameRef = useRef(0);
  const accuracyDirectionRef = useRef(1);
  const accuracySweepMsRef = useRef(DEFAULT_ACCURACY_SWEEP_MS);
  const turnTimeoutRef = useRef(null);

  const hasCompleted = challengeEnded;
  const shotActive = phase === PHASE.SHOT && Boolean(shot);
  const ballPoint = shot?.targetPoint ?? GAME.spot;
  const keeperPoint = shot ? pointForDirection(shot.keeperDirection) : pointForDirection(getDirection("CM"));
  const aimDirection = lockedDirection ?? selected;
  const showAim = phase === PHASE.DIRECTION;

  const resetChallengeState = useCallback(() => {
    if (turnTimeoutRef.current) {
      window.clearTimeout(turnTimeoutRef.current);
      turnTimeoutRef.current = null;
    }
    if (powerFrameRef.current) {
      cancelAnimationFrame(powerFrameRef.current);
      powerFrameRef.current = null;
    }
    if (accuracyFrameRef.current) {
      cancelAnimationFrame(accuracyFrameRef.current);
      accuracyFrameRef.current = null;
    }
    setScoreValue(initialScore);
    setTicker(`${userTeam.name.toUpperCase()} TO SHOOT`);
    setTickerTone("user");
    setChallengeEnded(false);
    setFailedShot(false);
    setPhase(PHASE.DIRECTION);
    setSelected(getDirection("CM"));
    setLockedDirection(null);
    setLockedPower(null);
    setShot(null);
    setPowerValue(0);
    setPowerCharging(false);
    powerValueRef.current = 0;
    setAccuracyValue(0);
    setAccuracyRunning(false);
    accuracyValueRef.current = 0;
    setAccuracySweepMs(DEFAULT_ACCURACY_SWEEP_MS);
    accuracySweepMsRef.current = DEFAULT_ACCURACY_SWEEP_MS;
  }, [initialScore, userTeam.name]);

  useEffect(() => {
    resetChallengeState();
  }, [resetChallengeState]);

  useEffect(() => {
    return () => {
      if (turnTimeoutRef.current) window.clearTimeout(turnTimeoutRef.current);
      if (powerFrameRef.current) cancelAnimationFrame(powerFrameRef.current);
      if (accuracyFrameRef.current) cancelAnimationFrame(accuracyFrameRef.current);
    };
  }, []);

  const tickerStyle = useMemo(() => {
    const team = tickerTone === "opponent" ? opponentTeam : userTeam;
    const style = teamTickerStyle(team);
    if (ticker === "GOAL!") return { ...style, animation: "goalFlash 0.82s steps(1, end) 1 forwards", "--goal-bg": team.primaryColour, "--goal-fg": team.textColour };
    return style;
  }, [opponentTeam, ticker, tickerTone, userTeam]);

  function normaliseChallengeCommentary(commentary) {
    const raw = String(commentary || "").toUpperCase();
    if (raw.includes("GOAL")) return "GOAL!";
    if (raw.includes("SAVED")) return "SAVED!";
    if (raw.includes("POST")) return "HIT THE POST!";
    if (raw.includes("CROSSBAR") || raw.includes("BAR")) return "HIT THE BAR!";
    return "MISSED!";
  }

  function toneForCommentary(commentary) {
    return commentary === "SAVED!" ? "opponent" : "user";
  }

  function positionMeterNeedle(fillRef, safeValue) {
    const node = fillRef?.current;
    if (!node) return;
    const track = node.parentElement;
    const trackWidth = track?.clientWidth || 0;
    if (trackWidth > 0) {
      node.style.left = "0px";
      node.style.transform = `translate3d(${(safeValue / 100) * trackWidth}px, 0, 0) translateX(-50%)`;
      node.dataset.meterValue = String(safeValue);
      return;
    }
    node.style.left = `${safeValue}%`;
    node.style.transform = "translateX(-50%)";
    node.dataset.meterValue = String(safeValue);
  }

  function setPowerVisual(nextPower, commitState = false) {
    const safePower = clamp(nextPower, 0, 100);
    powerValueRef.current = safePower;
    positionMeterNeedle(powerFillRef, safePower);
    if (commitState) setPowerValue(safePower);
  }

  function setAccuracyVisual(nextAccuracy, commitState = false) {
    const safeAccuracy = clamp(nextAccuracy, 0, 100);
    accuracyValueRef.current = safeAccuracy;
    positionMeterNeedle(accuracyFillRef, safeAccuracy);
    if (commitState) setAccuracyValue(safeAccuracy);
  }

  function readVisualMeterValue(fillRef, fallbackValue) {
    const rawDatasetValue = fillRef?.current?.dataset?.meterValue;
    const parsedDatasetValue = Number.parseFloat(String(rawDatasetValue || ""));
    if (Number.isFinite(parsedDatasetValue)) return clamp(parsedDatasetValue, 0, 100);
    const rawLeft = fillRef?.current?.style?.left;
    const parsed = Number.parseFloat(String(rawLeft || "").replace("%", ""));
    return Number.isFinite(parsed) ? clamp(parsed, 0, 100) : clamp(Number(fallbackValue) || 0, 0, 100);
  }

  function stopPowerFrame() {
    if (powerFrameRef.current) {
      cancelAnimationFrame(powerFrameRef.current);
      powerFrameRef.current = null;
    }
  }

  function stopAccuracyFrame() {
    if (accuracyFrameRef.current) {
      cancelAnimationFrame(accuracyFrameRef.current);
      accuracyFrameRef.current = null;
    }
  }

  function startPowerMeter() {
    stopPowerFrame();
    setPowerCharging(true);
    powerDirectionRef.current = 1;
    powerLastFrameRef.current = performance.now();
    setPowerVisual(0, true);

    const sweepPerMs = 100 / Math.max(1, POWER_SWEEP_MS / 2);
    const tick = (now) => {
      const delta = Math.min(Math.max(now - powerLastFrameRef.current, 0), 34);
      powerLastFrameRef.current = now;
      let next = powerValueRef.current + powerDirectionRef.current * delta * sweepPerMs;

      if (next >= 100) {
        next = 100;
        powerDirectionRef.current = -1;
      } else if (next <= 0) {
        next = 0;
        powerDirectionRef.current = 1;
      }

      setPowerVisual(next);
      powerFrameRef.current = requestAnimationFrame(tick);
    };

    powerFrameRef.current = requestAnimationFrame(tick);
  }

  function startAccuracyMeter() {
    stopAccuracyFrame();
    setAccuracyRunning(true);
    accuracyDirectionRef.current = 1;
    accuracyLastFrameRef.current = performance.now();
    setAccuracyVisual(0, true);

    const sweepPerMs = 100 / Math.max(1, accuracySweepMsRef.current / 2);
    const tick = (now) => {
      const delta = Math.min(Math.max(now - accuracyLastFrameRef.current, 0), 34);
      accuracyLastFrameRef.current = now;
      let next = accuracyValueRef.current + accuracyDirectionRef.current * delta * sweepPerMs;

      if (next >= 100) {
        next = 100;
        accuracyDirectionRef.current = -1;
      } else if (next <= 0) {
        next = 0;
        accuracyDirectionRef.current = 1;
      }

      setAccuracyVisual(next);
      accuracyFrameRef.current = requestAnimationFrame(tick);
    };

    accuracyFrameRef.current = requestAnimationFrame(tick);
  }

  function handleConfirmDirection() {
    if (phase !== PHASE.DIRECTION || hasCompleted) return;
    setLockedDirection(selected);
    setPowerValue(0);
    powerValueRef.current = 0;
    setPowerCharging(false);
    setLockedPower(null);
    setAccuracyValue(0);
    accuracyValueRef.current = 0;
    setAccuracyRunning(false);
    setPhase(PHASE.POWER);
  }

  function handleLockPower(event) {
    if (phase !== PHASE.POWER || !lockedDirection || hasCompleted) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();

    stopPowerFrame();
    setPowerCharging(false);

    const finalPower = displayedMeterValue(readVisualMeterValue(powerFillRef, powerValueRef.current));
    powerValueRef.current = finalPower;
    setPowerValue(finalPower);

    const nextAccuracySpeed = accuracySpeedForPower(finalPower, {}, null);
    setLockedPower(finalPower);
    setAccuracySweepMs(nextAccuracySpeed);
    accuracySweepMsRef.current = nextAccuracySpeed;
    setAccuracyValue(0);
    accuracyValueRef.current = 0;
    accuracyDirectionRef.current = 1;
    setPhase(PHASE_ACCURACY);
  }

  function resolveChallengeShot(direction, power, accuracy, accuracyOutcome) {
    const keeperReadChance = accuracyOutcome === "onTarget" ? accuracyKeeperReadChanceForValue(accuracy, {}, null) : null;
    const resolved = resolvePenalty({
      direction,
      power,
      keeperDirection: null,
      accuracyOutcome,
      keeperReadChance,
    });
    window.setTimeout(() => {
      playSound(resolved.goal ? DEFAULT_ASSETS.sounds.goalSound : DEFAULT_ASSETS.sounds.missSound, CHALLENGE_SHOT_RESULT_VOLUME);
    }, CHALLENGE_SHOT_RESULT_DELAY_MS);

    const challengeTicker = normaliseChallengeCommentary(resolved.commentary);
    const nextScore = resolved.goal ? scoreValue + 1 : scoreValue;
    setShot({ ...resolved, accuracy });
    setTicker(challengeTicker);
    setTickerTone(toneForCommentary(challengeTicker));
    setScoreValue(nextScore);
    setFailedShot(!resolved.goal);
    setPhase(PHASE.SHOT);

    if (turnTimeoutRef.current) window.clearTimeout(turnTimeoutRef.current);
    turnTimeoutRef.current = window.setTimeout(() => {
      turnTimeoutRef.current = null;
      if (resolved.goal) {
        setShot(null);
        setSelected(getDirection("CM"));
        setLockedDirection(null);
        setLockedPower(null);
        setPowerValue(0);
        powerValueRef.current = 0;
        setAccuracyValue(0);
        accuracyValueRef.current = 0;
        setTicker(`${userTeam.name.toUpperCase()} TO SHOOT`);
        setTickerTone("user");
        setPhase(PHASE.DIRECTION);
      } else {
        setChallengeEnded(true);
        setTicker(`I PUT ${nextScore} PAST CAPE VERDE`);
        setTickerTone("user");
        setPhase(PHASE.FINISHED);
      }
    }, GAME.shotMs + 420);
  }

  function handleLockAccuracy(event) {
    if (phase !== PHASE_ACCURACY || !lockedDirection || hasCompleted) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();

    stopAccuracyFrame();
    setAccuracyRunning(false);

    const finalAccuracy = displayedMeterValue(readVisualMeterValue(accuracyFillRef, accuracyValueRef.current));
    accuracyValueRef.current = finalAccuracy;
    setAccuracyValue(finalAccuracy);

    const finalPower = clamp(lockedPower ?? powerValueRef.current, 0, 100);
    const accuracyOutcome = accuracyOutcomeForValue(finalAccuracy, lockedDirection, {}, null);
    playSound(DEFAULT_ASSETS.sounds.userShot, 0.82);
    resolveChallengeShot(lockedDirection, finalPower, finalAccuracy, accuracyOutcome);
  }

  useEffect(() => {
    if (phase === PHASE.POWER && lockedDirection && !hasCompleted) {
      startPowerMeter();
      return () => stopPowerFrame();
    }
    stopPowerFrame();
    setPowerCharging(false);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lockedDirection?.id, hasCompleted]);

  useEffect(() => {
    if (phase === PHASE_ACCURACY && lockedDirection && !hasCompleted) {
      startAccuracyMeter();
      return () => stopAccuracyFrame();
    }
    stopAccuracyFrame();
    setAccuracyRunning(false);
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, lockedDirection?.id, hasCompleted]);

  const handleChallengeShare = async (payload = {}) => {
    if (challengeShareBusy) return;
    const previewWindow = reserveShareWindow();
    setChallengeShareBusy(true);
    try {
      const sharePayload = {
        score: payload.score ?? scoreValue,
        rank: payload.rank ?? null,
        username: payload.username || auth.currentUser?.displayName || auth.currentUser?.email?.split("@")[0] || "GUEST",
        userTeam: payload.userTeam || userTeam,
        opponentTeam: payload.opponentTeam || opponentTeam,
        challengeId: payload.challengeId || CHALLENGE_ID,
      };
      const blob = await createChallengeShareBlob(sharePayload);
      await shareOrDownloadResult({
        blob,
        filename: "monday-cup-beat-the-goalie.png",
        previewWindow,
        shareTitle: "Monday Cup Beat the Goalie",
        shareText: `I put ${sharePayload.score} past Cape Verde in Monday Cup Beat the Goalie!

Can you beat my score?

⚽ mondaycup.co.uk`,
        nativeFrame: "standard",
      });
    } catch (error) {
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      console.error("Challenge share failed", error);
      window.alert("Sorry, the challenge result could not be shared. Please try again.");
    } finally {
      setChallengeShareBusy(false);
    }
  };

  return (
    <Shell>
      <MemoFullPitchExtensionBackground />
      <div className="relative z-[2] flex h-[100dvh] flex-col overflow-x-visible overflow-y-hidden bg-[#0d6c3d]">
        <style>{`
          .led-text-glow { color: #F7D117; text-shadow: 0 0 0.65px rgba(247,209,23,0.32); }
          .pen-marker-goal { box-shadow: 0 0 5px rgba(34,197,94,0.72), 0 0 10px rgba(34,197,94,0.25); }
          .pen-marker-save { box-shadow: 0 0 5px rgba(239,68,68,0.72), 0 0 10px rgba(239,68,68,0.25); }
          .pen-marker-empty { box-shadow: 0 0 5px rgba(247,209,23,0.42), 0 0 9px rgba(247,209,23,0.18); }
          @keyframes goalFlash {
            0%, 19.9% { background: var(--goal-bg); color: var(--goal-fg); }
            20%, 39.9% { background: var(--goal-fg); color: var(--goal-bg); }
            40%, 59.9% { background: var(--goal-bg); color: var(--goal-fg); }
            60%, 79.9% { background: var(--goal-fg); color: var(--goal-bg); }
            80%, 100% { background: var(--goal-bg); color: var(--goal-fg); }
          }
        `}</style>

        <MemoChallengeTopBar onExit={onExit} />
        <MemoChallengeScoreboard
          userTeam={userTeam}
          opponentTeam={opponentTeam}
          score={scoreValue}
          failedShot={failedShot}
          ticker={ticker}
          tickerStyle={tickerStyle}
        />
        <div className="relative min-h-0 flex-1 overflow-x-visible overflow-y-hidden bg-[#0d6c3d]">
          <MemoPitch
            ballPoint={ballPoint}
            keeperPoint={keeperPoint}
            shot={shot}
            shotActive={shotActive}
            activeTeam={userTeam}
            defenderTeam={opponentTeam}
            showAim={showAim}
            aimDirection={aimDirection}
            assets={DEFAULT_ASSETS}
            stageLabel="BEAT THE GOALIE"
            hideMatchActors={false}
            showChampionsBadge={false}
            podiumBadgeMode={null}
            twoPlayerMode={false}
          />
          <ControlOverlay
            phase={phase}
            selected={selected}
            setSelected={setSelected}
            handleConfirmDirection={handleConfirmDirection}
            powerValue={powerValue}
            powerCharging={powerCharging}
            powerFillRef={powerFillRef}
            handleLockPower={handleLockPower}
            powerTargetZone={powerTargetZone}
            accuracyValue={accuracyValue}
            accuracyRunning={accuracyRunning}
            accuracyFillRef={accuracyFillRef}
            handleLockAccuracy={handleLockAccuracy}
            accuracyTargetZone={accuracyTargetZone}
            opponentTeam={opponentTeam}
            endActionLabel="PLAY AGAIN"
            endActionEnabled={challengeEnded}
            onEndAction={resetChallengeState}
          />
        </div>
        {challengeEnded && (
          <ChallengeEndModal
            score={scoreValue}
            userTeam={userTeam}
            opponentTeam={opponentTeam}
            onReplay={resetChallengeState}
            onExit={onExit}
            onChangeTeams={onChangeTeams || onExit}
            onShare={handleChallengeShare}
            shareBusy={challengeShareBusy}
          />
        )}
      </div>
    </Shell>
  );
}
