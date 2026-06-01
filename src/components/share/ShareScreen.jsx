import { useMemo, useRef, useState } from "react";
import { captureShareElementBlob, reserveShareWindow, shareOrDownloadResult } from "../../utils/shareExport.js";
import { PitchPageBackground } from "../layout/PitchPageBackground.jsx";
import { ScreenTopBar } from "../layout/ScreenTopBar.jsx";
import { MatchPitchPreview } from "../match/FootballGame.jsx";
import { teamToGameTeam } from "../../logic/matchPresentation.js";
import { DIRECTIONS, GAME, getDirection, keeperTransform } from "../../logic/penaltyEngine.js";
import { GROUPS } from "../../data/teams.js";
import { ASSETS } from "../../data/assets.js";

const EXPORT_STATES = [
  { id: "match", label: "MATCH" },
  { id: "bracket", label: "BRACKET" },
  { id: "poster", label: "POSTER" },
  { id: "shirt", label: "SHIRT" },
];

const TEAM_OPTIONS = Object.values(GROUPS).flat().sort((a, b) => a.localeCompare(b));
const CROWD_OPTIONS = [
  { value: "GROUP STAGE", label: "GROUP" },
  { value: "ROUND OF 16", label: "KNOCKOUT" },
  { value: "FINAL", label: "FINAL" },
];
const FLASH_BG_OPTIONS = [
  { value: "teamA", label: "TEAM A" },
  { value: "teamB", label: "TEAM B" },
  { value: "yellow", label: "YELLOW" },
  { value: "dark", label: "DARK" },
  { value: "custom", label: "CUSTOM" },
];
const BG_OPTIONS = [
  { value: "pitch", label: "PITCH" },
  { value: "team", label: "TEAM" },
  { value: "custom", label: "CUSTOM" },
];
const FONT_OPTIONS = [
  { value: "led", label: "LED" },
  { value: "bold", label: "BOLD" },
  { value: "regular", label: "REG" },
  { value: "light", label: "LIGHT" },
];
const FONT_WEIGHT_OPTIONS = [
  { value: "700", label: "BOLD" },
  { value: "900", label: "HEAVY" },
  { value: "400", label: "REG" },
];
const FONT_STYLE_OPTIONS = [
  { value: "normal", label: "NORMAL" },
  { value: "italic", label: "ITALIC" },
];
const BADGE_OPTIONS = [
  { value: "none", label: "NONE" },
  { value: "monday", label: "MONDAY" },
  { value: "champion", label: "CHAMPION" },
  { value: "runnerUp", label: "RUNNER-UP" },
  { value: "third", label: "THIRD" },
];
const SD_OPTIONS = [0, 1, 2, 3];
const SCORE_DISPLAY_OPTIONS = [
  { value: "score", label: "SCORE" },
  { value: "vs", label: "VS" },
];
const LED_YELLOW = "#F7D117";
const IVORY = "#F5F1E8";
const DARK_GREEN = "#072D1D";
const SHARE_PREVIEW_CLASS = "w-[min(400px,calc(100vw-32px))] max-w-[400px]";
const PITCH_MOW_BACKGROUND_IMAGE = "repeating-linear-gradient(90deg, rgba(245,241,232,0.055) 0%, rgba(245,241,232,0.055) 11.1%, rgba(11,45,29,0.08) 11.1%, rgba(11,45,29,0.08) 22.2%), linear-gradient(rgba(245,241,232,0.025), rgba(11,45,29,0.08))";
const PITCH_MOW_BACKGROUND_STYLE = {
  backgroundColor: "#0d6c3d",
  backgroundImage: PITCH_MOW_BACKGROUND_IMAGE,
  backgroundSize: "100% 100%",
};
const DIRECTION_TO_SLOT = { LT: "1", CT: "2", RT: "3", LM: "4", CM: "5", RM: "6", LB: "7", CB: "8", RB: "9" };

function scoreFromProps({ team, opponent, score, matchResult }) {
  if (matchResult?.home && matchResult?.away) {
    const userIsHome = matchResult.home === team;
    return {
      user: Number(userIsHome ? matchResult.homeGoals : matchResult.awayGoals) || 0,
      opponent: Number(userIsHome ? matchResult.awayGoals : matchResult.homeGoals) || 0,
    };
  }

  if (Array.isArray(score)) {
    return {
      user: Number(score[0]) || 0,
      opponent: Number(score[1]) || 0,
    };
  }

  return { user: 0, opponent: 0 };
}

function markerForAttempt(attempt) {
  if (typeof attempt === "string") {
    const value = attempt.toUpperCase();
    if (value === "G" || value === "GOAL") return "G";
    if (value === "S" || value === "SAVE" || value === "SAVED") return "S";
  }
  if (attempt?.goal === true || attempt?.result === "goal" || attempt?.shotResult === "goal") return "G";
  if (attempt?.goal === false || attempt?.result === "save" || attempt?.shotResult === "save") return "S";
  return "";
}

function fallbackAttemptsFromScore(goals = 0, slots = GAME.regulationPens) {
  return Array.from({ length: slots }).map((_, index) => (index < goals ? "G" : "S"));
}

function initialAttemptSequence(source = [], goals = 0) {
  const mapped = Array.isArray(source) ? source.map(markerForAttempt).filter(Boolean) : [];
  return mapped.length ? mapped : fallbackAttemptsFromScore(goals);
}

function padMarkers(sequence = [], totalSlots = GAME.regulationPens) {
  return Array.from({ length: totalSlots }).map((_, index) => sequence[index] || "");
}

function previewTicker({ team, opponent, matchResult }) {
  if (!matchResult) return "SHARE YOUR RESULT";
  if (matchResult.isDraw) return "DRAW!";
  if (matchResult.winner) return `${String(matchResult.winner).toUpperCase()} WINS!`;
  return `${String(matchResult.won ? team : opponent).toUpperCase()} WINS!`;
}

function fontFamilyFor(value) {
  if (value === "led") return 'IntoDotMatrix, monospace';
  if (value === "light") return 'SportsDINLight, SportsDINRegular, sans-serif';
  if (value === "regular") return 'SportsDINRegular, sans-serif';
  return 'SportsDINBold, SportsDINRegular, sans-serif';
}

function backgroundFor(mode, team, custom) {
  if (mode === "team") return team.primaryColour;
  if (mode === "custom") return custom;
  return "#0d6c3d";
}

function hexWithAlpha(hex, alpha = 1) {
  const clean = String(hex || "#F7D117").replace("#", "");
  const value = clean.length === 3 ? clean.split("").map((char) => char + char).join("") : clean.padEnd(6, "0").slice(0, 6);
  const int = Number.parseInt(value, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, Number(alpha)))})`;
}

function TeamFlag({ team, className = "h-4 w-6", style = null }) {
  if (!team.flag) return null;
  return <img src={team.flag} alt={`${team.name} flag`} className={`${className} rounded-sm object-cover`} style={style || undefined} draggable={false} />;
}

function clampNumber(value, min, max, fallback = 0) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}

function editorTransform({ x = 0, y = 0, scale = 1 } = {}) {
  return `translate(${Number(x) || 0}px, ${Number(y) || 0}px) scale(${Number(scale) || 1})`;
}

function textStroke(weight = 0, colour = LED_YELLOW) {
  const px = clampNumber(weight, 0, 8, 0);
  return px > 0 ? `${px}px ${colour || LED_YELLOW}` : "0 transparent";
}

function mergeTransforms(...parts) {
  return parts.filter(Boolean).join(" ");
}

function MarkerDots({ markers = [], totalSlots = GAME.regulationPens }) {
  const visible = padMarkers(markers, totalSlots);
  return (
    <div className="inline-flex min-w-0 justify-center gap-[3px]">
      {visible.map((marker, index) => {
        const colour = marker === "G" ? "bg-green-500 pen-marker-goal" : marker === "S" ? "bg-red-500 pen-marker-save" : "bg-[#F7D117] pen-marker-empty";
        return <span key={`${marker}-${index}`} className={`h-[6px] w-[6px] shrink-0 rounded-full ${colour}`} />;
      })}
    </div>
  );
}

function ShareScoreboard({
  userTeam,
  opponentTeam,
  score,
  stageTitle,
  flashText,
  flashStyle,
  showMarkers,
  markerText,
  usernameEnabled,
  username,
  teamAMarkers,
  teamBMarkers,
  totalMarkerSlots,
  design = {},
}) {
  const d = {
    scoreboardHeight: 34,
    textColour: LED_YELLOW,
    fontType: "led",
    outlineWeight: 0,
    outlineColour: DARK_GREEN,
    showStage: true,
    stageBox: true,
    stageScale: 1,
    stageX: 0,
    stageY: 0,
    showFlags: true,
    flagScale: 1,
    flagAX: 0,
    flagAY: 0,
    flagBX: 0,
    flagBY: 0,
    showTeamCodes: true,
    teamScale: 1,
    teamAX: 0,
    teamAY: 0,
    teamBX: 0,
    teamBY: 0,
    showScore: true,
    scoreDisplayMode: "score",
    scoreScale: 1,
    scoreX: 0,
    scoreY: 0,
    markerBox: true,
    markerScale: 1,
    markerAX: 0,
    markerAY: 0,
    markerBX: 0,
    markerBY: 0,
    usernameScale: 1,
    usernameX: 0,
    usernameY: 0,
    flashBox: true,
    flashScale: 1,
    flashX: 0,
    flashY: 0,
    flashFontType: "bold",
    flashOutlineWeight: 0,
    flashOutlineColour: DARK_GREEN,
    ...design,
  };
  const boardHeight = `${clampNumber(d.scoreboardHeight, 24, 46, 34)}%`;
  const boardTextStyle = {
    color: d.textColour,
    fontFamily: fontFamilyFor(d.fontType),
    WebkitTextStroke: textStroke(d.outlineWeight, d.outlineColour),
  };
  const scoreTextStyle = {
    ...boardTextStyle,
    fontSize: `clamp(18px, ${7 * Number(d.scoreScale || 1)}cqw, ${34 * Number(d.scoreScale || 1)}px)`,
    fontWeight: 900,
    transform: editorTransform({ x: d.scoreX, y: d.scoreY, scale: d.scoreScale }),
  };
  const codeTextStyle = (side) => ({
    ...boardTextStyle,
    fontSize: `clamp(18px, ${7 * Number(d.teamScale || 1)}cqw, ${34 * Number(d.teamScale || 1)}px)`,
    transform: editorTransform({ x: side === "A" ? d.teamAX : d.teamBX, y: side === "A" ? d.teamAY : d.teamBY, scale: d.teamScale }),
  });
  const markerShell = d.markerBox
    ? "inline-flex max-w-full items-center justify-center rounded-[6px] border border-[#F5F1E8]/22 bg-[#050505] px-2 py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]"
    : "inline-flex max-w-full items-center justify-center px-1 py-0";

  return (
    <section
      data-share-scoreboard="true"
      className="relative shrink-0 overflow-hidden border-y border-[#F5F1E8]/18 bg-[#050505] shadow-[inset_0_1px_0_rgba(245,241,232,0.16),inset_0_-1px_0_rgba(245,241,232,0.18),0_2px_8px_rgba(0,0,0,0.22)]"
      style={{ height: boardHeight, containerType: "inline-size" }}
    >
      <div data-share-scoreboard-main="true" className="relative h-[74%] overflow-hidden bg-[#050505]">
        <div
          className="pointer-events-none absolute left-[2px] right-[2px] top-[2px] bottom-[2px] opacity-50"
          style={{
            backgroundImage: "radial-gradient(circle at center, rgba(247,209,23,0.24) 0.72px, transparent 1.44px)",
            backgroundSize: "6px calc(100% / 12)",
            backgroundPosition: "center top",
            backgroundRepeat: "repeat",
          }}
        />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.10),rgba(247,209,23,0.035),rgba(11,95,53,0.10))]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]" />

        <div className="relative z-[1] flex h-full items-center px-[18px] py-0">
          <div
            className="grid h-[88%] w-full items-center"
            style={{
              gridTemplateColumns: "42px minmax(0,1fr) 44px 30px 44px minmax(0,1fr) 42px",
              gridTemplateRows: "25% 50% 25%",
            }}
          >
            {d.showStage && (
              <div data-normalise-stage-label="true" className="col-start-2 col-end-7 row-start-1 flex items-center justify-center">
                <div className={`${d.stageBox ? "rounded-[6px] border border-[#F5F1E8]/22 bg-[#050505] px-3 py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]" : "px-1 py-0"} inline-flex max-w-full items-center justify-center`} style={{ transform: editorTransform({ x: d.stageX, y: d.stageY, scale: d.stageScale }) }}>
                  <div className="led-text-glow font-led flex min-h-[16px] items-center justify-center whitespace-nowrap text-center text-[10px] font-black uppercase leading-none tracking-[0.11em]" style={{ ...boardTextStyle, fontWeight: 900 }}>
                    {stageTitle || "FINAL"}
                  </div>
                </div>
              </div>
            )}

            <div className="col-start-1 row-start-2 flex h-full items-center justify-center">
              {d.showFlags && <TeamFlag team={userTeam} className="h-[16px] w-[24px] ring-1 ring-[#F7D117]/88 shadow-[0_0_6px_rgba(247,209,23,0.30)] drop-shadow-[0_0_3px_rgba(247,209,23,0.14)]" style={{ transform: editorTransform({ x: d.flagAX, y: d.flagAY, scale: d.flagScale }) }} />}
            </div>
            <div className="col-start-2 row-start-2 flex h-full min-w-0 items-center justify-center px-2">
              {d.showTeamCodes && <div className="led-text-glow font-led w-full text-center font-normal leading-none tracking-tight" style={codeTextStyle("A")}>{userTeam.code}</div>}
            </div>
            {d.showScore && d.scoreDisplayMode === "vs" ? (
              <div className="col-start-3 col-end-6 row-start-2 flex h-full items-center justify-center">
                <div className="led-text-glow font-led" style={scoreTextStyle}>VS</div>
              </div>
            ) : (
              <>
                <div className="col-start-3 row-start-2 flex h-full items-center justify-center">
                  {d.showScore && <div className="led-text-glow font-led tabular-nums" style={scoreTextStyle}>{score.user}</div>}
                </div>
                <div className="col-start-4 row-start-2 flex h-full items-center justify-center">
                  {d.showScore && <div className="led-text-glow font-led" style={scoreTextStyle}>-</div>}
                </div>
                <div className="col-start-5 row-start-2 flex h-full items-center justify-center">
                  {d.showScore && <div className="led-text-glow font-led tabular-nums" style={scoreTextStyle}>{score.opponent}</div>}
                </div>
              </>
            )}
            <div className="col-start-6 row-start-2 flex h-full min-w-0 items-center justify-center px-2">
              {d.showTeamCodes && <div className="led-text-glow font-led w-full text-center font-normal leading-none tracking-tight" style={codeTextStyle("B")}>{opponentTeam.code}</div>}
            </div>
            <div className="col-start-7 row-start-2 flex h-full items-center justify-center">
              {d.showFlags && <TeamFlag team={opponentTeam} className="h-[16px] w-[24px] ring-1 ring-[#F7D117]/88 shadow-[0_0_6px_rgba(247,209,23,0.30)] drop-shadow-[0_0_3px_rgba(247,209,23,0.14)]" style={{ transform: editorTransform({ x: d.flagBX, y: d.flagBY, scale: d.flagScale }) }} />}
            </div>

            {showMarkers ? (
              <>
                <div className="col-start-2 row-start-3 flex h-full items-center justify-center">
                  <div className={markerShell} style={{ transform: editorTransform({ x: d.markerAX, y: d.markerAY, scale: d.markerScale }) }}>
                    <span className="flex min-h-[16px] items-center justify-center leading-none"><MarkerDots markers={teamAMarkers} totalSlots={totalMarkerSlots} /></span>
                  </div>
                </div>
                <div data-share-username-slot="true" className="col-start-3 col-end-6 row-start-3 flex h-full items-center justify-center px-1">
                  <div className={`${usernameEnabled ? "visible" : "invisible"} led-text-glow font-led flex min-h-[16px] max-w-full items-center justify-center truncate whitespace-nowrap text-center text-[9px] font-black uppercase leading-none tracking-[0.11em]`} style={{ ...boardTextStyle, transform: editorTransform({ x: d.usernameX, y: d.usernameY, scale: d.usernameScale }) }}>
                    {username || "PLAYER"}
                  </div>
                </div>
                <div className="col-start-6 row-start-3 flex h-full items-center justify-center">
                  <div className={markerShell} style={{ transform: editorTransform({ x: d.markerBX, y: d.markerBY, scale: d.markerScale }) }}>
                    <span className="flex min-h-[16px] items-center justify-center leading-none"><MarkerDots markers={teamBMarkers} totalSlots={totalMarkerSlots} /></span>
                  </div>
                </div>
              </>
            ) : (
              <div className="col-start-2 col-end-7 row-start-3 flex h-full items-center justify-center">
                <div className="led-text-glow font-led inline-flex min-h-[18px] max-w-full items-center justify-center truncate rounded-[6px] border border-[#F5F1E8]/22 px-3 text-center text-[10px] font-black uppercase leading-none tracking-[0.12em] shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]" style={{ ...boardTextStyle, background: d.markerBox ? "#050505" : "transparent", borderColor: d.markerBox ? "rgba(245,241,232,0.22)" : "transparent", transform: editorTransform({ x: d.markerAX, y: d.markerAY, scale: d.markerScale }) }}>
                  {markerText || "PENALTIES"}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div data-share-flash="true" className="grid h-[26%] w-full place-items-center overflow-hidden px-[3%] text-center home-copy-bold text-[20px] font-black uppercase leading-none tracking-[0.085em]" style={{ ...flashStyle, background: d.flashBox ? flashStyle.background : "transparent", boxShadow: d.flashBox ? "0 0 8px rgba(245,241,232,0.05), inset 0 2px 8px rgba(255,255,255,0.08)" : "none" }}>
        <span style={{ fontFamily: fontFamilyFor(d.flashFontType), transform: editorTransform({ x: d.flashX, y: d.flashY, scale: d.flashScale }), WebkitTextStroke: textStroke(d.flashOutlineWeight, d.flashOutlineColour) }}>{flashText || "SHARE YOUR RESULT"}</span>
      </div>
    </section>
  );
}

function positionPoint(value) {
  if (value === "spot") return { ...GAME.spot, direction: null };
  const direction = getDirection(value);
  const goal = GAME.goal;
  return {
    x: goal.left + ((direction.col + 0.5) / 3) * goal.width,
    y: goal.top + ((direction.row + 0.5) / 3) * goal.height,
    direction,
  };
}

function ShareBadgeOverlay({ mode, scale = 1, x = 0, y = 0 }) {
  if (!mode || mode === "none") return null;
  const badgeMap = {
    monday: { src: ASSETS.branding.mondayLogo, alt: "Monday Cup", width: "34%", height: "24%", glow: LED_YELLOW },
    champion: { src: ASSETS.badges.champion, alt: "Champion", width: "34%", height: "24%", glow: LED_YELLOW },
    runnerUp: { src: ASSETS.badges.runnerUp, alt: "Runner-up", width: "34%", height: "24%", glow: IVORY },
    third: { src: ASSETS.badges.third, alt: "Third place", width: "34%", height: "24%", glow: "#C8863A" },
  };
  const badge = badgeMap[mode] || badgeMap.monday;
  const goalLine = GAME.goal.top + GAME.goal.height;
  return (
    <div
      className="pointer-events-none absolute left-1/2 z-[8] flex items-center justify-center"
      style={{ top: `${(goalLine - 8) / 2}%`, width: badge.width, height: badge.height, transform: mergeTransforms("translate(-50%, -50%)", editorTransform({ x, y, scale })) }}
      aria-hidden="true"
    >
      <div className="absolute left-1/2 top-1/2 h-[86%] w-[96%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl" style={{ background: `${badge.glow}44` }} />
      <div className="absolute left-1/2 top-1/2 h-[58%] w-[72%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl" style={{ background: `${badge.glow}55` }} />
      <img src={badge.src} alt={badge.alt} className="relative z-[1] h-full w-full object-contain drop-shadow-[0_16px_22px_rgba(0,0,0,0.38)]" draggable={false} />
    </div>
  );
}

function MatchActorLayer({ userTeam, opponentTeam, showGoalkeeper, goalkeeperPosition, showBall, ballPosition, goalkeeperScale = 1, ballScale = 1 }) {
  const keeper = positionPoint(goalkeeperPosition);
  const ball = positionPoint(ballPosition);
  const keeperDirection = keeper.direction || getDirection("CM");
  return (
    <>
      {showGoalkeeper && (
        <div
          className="absolute z-[9] grid h-[44px] w-[44px] place-items-center rounded-full border-2"
          style={{
            left: `${keeper.x}%`,
            top: `${keeper.y}%`,
            background: opponentTeam.primaryColour,
            borderColor: opponentTeam.textColour,
            transform: mergeTransforms(keeperTransform(keeperDirection, goalkeeperPosition !== "spot"), `scale(${Number(goalkeeperScale) || 1})`),
          }}
        >
          <img src={ASSETS.game.goalkeeper} alt="Goalkeeper" className="h-[32px] w-[32px] object-contain" draggable={false} />
        </div>
      )}
      {showBall && (
        <div
          className="absolute z-[10] grid h-[38px] w-[38px] place-items-center rounded-full border-2"
          style={{ left: `${ball.x}%`, top: `${ball.y}%`, background: userTeam.primaryColour, borderColor: userTeam.textColour, transform: mergeTransforms("translate(-50%, -50%)", `scale(${Number(ballScale) || 1})`) }}
        >
          <img src={ASSETS.game.ball} alt="Ball" className="h-[27px] w-[27px] object-contain" draggable={false} />
        </div>
      )}
    </>
  );
}

function ShareMatchPreview({
  userTeam,
  opponentTeam,
  score,
  stageTitle,
  flashText,
  flashStyle,
  crowdStage,
  showMarkers,
  markerText,
  usernameEnabled,
  username,
  teamAMarkers,
  teamBMarkers,
  totalMarkerSlots,
  badgeMode,
  showGoalkeeper,
  goalkeeperPosition,
  showBall,
  ballPosition,
  matchDesign = {},
}) {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0d6c3d]">
      <ShareScoreboard
        userTeam={userTeam}
        opponentTeam={opponentTeam}
        score={score}
        stageTitle={stageTitle}
        flashText={flashText}
        flashStyle={flashStyle}
        showMarkers={showMarkers}
        markerText={markerText}
        usernameEnabled={usernameEnabled}
        username={username}
        teamAMarkers={teamAMarkers}
        teamBMarkers={teamBMarkers}
        totalMarkerSlots={totalMarkerSlots}
        design={matchDesign}
      />
      <div className="relative min-h-0 flex-1 overflow-hidden bg-[#0d6c3d]">
        <div className="absolute inset-x-0 top-0" style={{ height: `${clampNumber(matchDesign.pitchHeight, 500, 760, 620)}px` }}>
          <MatchPitchPreview userTeam={userTeam} opponentTeam={opponentTeam} stageLabel={crowdStage} showActors={false} pitchMowVariant="export" />
          <ShareBadgeOverlay mode={badgeMode} scale={matchDesign.badgeScale} x={matchDesign.badgeX} y={matchDesign.badgeY} />
          <MatchActorLayer
            userTeam={userTeam}
            opponentTeam={opponentTeam}
            showGoalkeeper={showGoalkeeper}
            goalkeeperPosition={goalkeeperPosition}
            showBall={showBall}
            ballPosition={ballPosition}
            goalkeeperScale={matchDesign.goalkeeperScale}
            ballScale={matchDesign.ballScale}
          />
        </div>
      </div>
    </div>
  );
}

function BracketSlot({ label, team, winner = false }) {
  return (
    <div className={`relative flex h-[30px] items-center justify-between rounded-[8px] border px-2 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)] ${winner ? "border-[#F7D117]/90 bg-[#F7D117] text-[#072D1D]" : "border-[#F5F1E8]/24 bg-[#051A11]/72 text-[#F5F1E8]"}`}>
      <span className="home-copy-bold text-[7px] font-black uppercase tracking-[0.13em] opacity-70">{label}</span>
      <span className="home-copy-bold max-w-[74%] truncate text-[9px] font-black uppercase tracking-[0.08em]">{team}</span>
    </div>
  );
}

function BracketPreview({ bracketTitle, bracketTeams, champion }) {
  const qf = padArray(bracketTeams, 8, ["Ghana", "France", "Brazil", "England", "Canada", "Spain", "Argentina", "Portugal"]);
  const sf = [qf[0], qf[3], qf[4], qf[7]];
  const finalists = [sf[0], sf[3]];
  return (
    <div className="relative h-full w-full overflow-hidden text-[#F5F1E8]" style={PITCH_MOW_BACKGROUND_STYLE}>
      <div className="relative z-[1] flex h-full flex-col p-6">
        <div className="mb-4 text-center">
          <div className="led-text-glow font-led text-[15px] font-black uppercase tracking-[0.14em] text-[#F7D117]">{bracketTitle || "ROAD TO THE FINAL"}</div>
          <div className="mt-1 home-copy-bold text-[8px] font-black uppercase tracking-[0.22em] text-[#F5F1E8]/78">QUARTER-FINALS ONWARDS</div>
        </div>
        <div className="grid min-h-0 flex-1 grid-cols-[1fr_0.8fr_0.8fr_1fr] gap-3">
          <div className="flex flex-col justify-around">
            {qf.slice(0, 4).map((team, index) => <BracketSlot key={`left-${team}-${index}`} label={`QF${index + 1}`} team={team} />)}
          </div>
          <div className="flex flex-col justify-center gap-[58px]">
            <BracketSlot label="SF1" team={sf[0]} winner />
            <BracketSlot label="SF2" team={sf[1]} />
          </div>
          <div className="flex flex-col justify-center gap-[58px]">
            <BracketSlot label="SF3" team={sf[2]} />
            <BracketSlot label="SF4" team={sf[3]} winner />
          </div>
          <div className="flex flex-col justify-around">
            {qf.slice(4, 8).map((team, index) => <BracketSlot key={`right-${team}-${index}`} label={`QF${index + 5}`} team={team} />)}
          </div>
        </div>
        <div className="relative z-[2] mx-auto -mt-4 flex w-[58%] flex-col items-center gap-2 rounded-[14px] border border-[#F7D117]/50 bg-[#051A11]/78 p-3 shadow-[0_12px_28px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(245,241,232,0.08)]">
          <div className="grid w-full grid-cols-2 gap-2">
            <BracketSlot label="FINAL" team={finalists[0]} />
            <BracketSlot label="FINAL" team={finalists[1]} />
          </div>
          <div className="led-text-glow font-led text-[10px] font-black uppercase tracking-[0.14em] text-[#F7D117]">CHAMPION</div>
          <div className="home-copy-bold w-full truncate text-center text-[18px] font-black uppercase leading-none tracking-[0.08em] text-[#F5F1E8]">{champion || finalists[0]}</div>
        </div>
      </div>
    </div>
  );
}

function PosterPreview({
  posterTitle,
  posterSubtitle,
  posterSecondSubtitle,
  posterShowLogo,
  posterLogoGlow,
  posterLogoShadow,
  posterBgMode,
  posterBgTeam,
  posterCustomBg,
  posterFontColour,
  posterTitleFontType,
  posterSubtitleFontType,
  posterSecondSubtitleFontType,
  posterShowBrothers,
  posterLogoScale,
  posterTitleScale,
  posterSubtitleScale,
  posterSecondSubtitleScale,
  posterBrothersScale,
  posterLogoY,
  posterTitleY,
  posterSubtitleY,
  posterSecondSubtitleY,
  posterBrothersY,
  posterLogoX = 0,
  posterTitleX = 0,
  posterSubtitleX = 0,
  posterSecondSubtitleX = 0,
  posterBrothersX = 0,
  posterTitleColour,
  posterSubtitleColour,
  posterSecondSubtitleColour,
  posterOutlineWeight = 0,
  posterOutlineColour = DARK_GREEN,
  posterGlowColour,
  posterGlowOpacity,
  posterGlowBrightness,
  posterShadowOpacity,
}) {
  const team = teamToGameTeam(posterBgTeam);
  const background = backgroundFor(posterBgMode, team, posterCustomBg);
  const showPitch = posterBgMode === "pitch";
  const hasSubtitle = Boolean(posterSubtitle);
  const hasSecondSubtitle = Boolean(posterSecondSubtitle);
  const logoWidth = Math.max(24, Math.min(48, 36 * Number(posterLogoScale || 1)));
  const titleSize = Math.max(18, Math.min(48, 30 * Number(posterTitleScale || 1)));
  const subtitleSize = Math.max(8, Math.min(22, 12 * Number(posterSubtitleScale || 1)));
  const secondSubtitleSize = Math.max(7, Math.min(20, 10 * Number(posterSecondSubtitleScale || 1)));
  const brothersWidth = Math.max(18, Math.min(40, 28 * Number(posterBrothersScale || 1)));
  const contentBottomPadding = posterShowBrothers ? 78 : 32;
  const glowOpacity = Math.max(0, Math.min(1, Number(posterGlowOpacity || 0)));
  const glowBrightness = Math.max(0.4, Math.min(2, Number(posterGlowBrightness || 1)));
  const shadowOpacity = Math.max(0, Math.min(1, Number(posterShadowOpacity || 0)));
  return (
    <div
      className="relative h-full w-full overflow-hidden text-[#F5F1E8]"
      style={showPitch ? PITCH_MOW_BACKGROUND_STYLE : { backgroundColor: background }}
    >
      <div className="absolute inset-[4px] border border-[#F5F1E8]/20" />
      <div className="relative z-[1] flex h-full flex-col items-center justify-center px-7 text-center" style={{ gap: posterShowLogo ? 15 : 23, paddingBottom: contentBottomPadding, paddingTop: posterShowLogo ? 30 : 46 }}>
        {posterShowLogo && (
          <div className="relative grid shrink-0 place-items-center" style={{ width: `${logoWidth}%`, transform: `translate(${Number(posterLogoX || 0)}px, ${Number(posterLogoY || 0)}px)` }}>
            {posterLogoGlow && <div className="absolute h-[128%] w-[150%] rounded-full blur-2xl" style={{ background: hexWithAlpha(posterGlowColour, glowOpacity), filter: `brightness(${glowBrightness})` }} />}
            {posterLogoGlow && <div className="absolute h-[92%] w-[112%] rounded-full blur-xl" style={{ background: hexWithAlpha(posterGlowColour, glowOpacity * 0.72), filter: `brightness(${glowBrightness})` }} />}
            {posterLogoShadow && <div className="absolute h-[92%] w-[110%] translate-y-[12%] rounded-full bg-black blur-xl" style={{ opacity: shadowOpacity }} />}
            <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="relative z-[1] w-full object-contain drop-shadow-[0_16px_22px_rgba(0,0,0,0.32)]" draggable={false} />
          </div>
        )}
        <div className="flex min-h-0 max-w-full flex-col items-center justify-center gap-3">
          <div className="led-text-glow max-w-full whitespace-normal break-words uppercase leading-[0.92] tracking-[0.12em]" style={{ color: posterTitleColour || posterFontColour, fontFamily: fontFamilyFor(posterTitleFontType), fontSize: titleSize, fontWeight: posterTitleFontType === "light" ? 300 : 900, WebkitTextStroke: textStroke(posterOutlineWeight, posterOutlineColour), transform: `translate(${Number(posterTitleX || 0)}px, ${Number(posterTitleY || 0)}px)` }}>
            {posterTitle || "COMING SOON"}
          </div>
          {hasSubtitle && <div className="home-copy-bold max-w-full uppercase leading-none tracking-[0.20em]" style={{ color: posterSubtitleColour || posterFontColour, fontFamily: fontFamilyFor(posterSubtitleFontType), fontSize: subtitleSize, fontWeight: posterSubtitleFontType === "light" ? 300 : 900, WebkitTextStroke: textStroke(posterOutlineWeight, posterOutlineColour), transform: `translate(${Number(posterSubtitleX || 0)}px, ${Number(posterSubtitleY || 0)}px)` }}>{posterSubtitle}</div>}
          {hasSecondSubtitle && <div className="home-copy-bold max-w-full uppercase leading-none tracking-[0.17em] opacity-90" style={{ color: posterSecondSubtitleColour || posterFontColour, fontFamily: fontFamilyFor(posterSecondSubtitleFontType), fontSize: secondSubtitleSize, fontWeight: posterSecondSubtitleFontType === "light" ? 300 : 900, WebkitTextStroke: textStroke(posterOutlineWeight, posterOutlineColour), transform: `translate(${Number(posterSecondSubtitleX || 0)}px, ${Number(posterSecondSubtitleY || 0)}px)` }}>{posterSecondSubtitle}</div>}
        </div>
        {posterShowBrothers && <img src={ASSETS.branding.myMundialLogo} alt="Brothers" className="absolute left-1/2 object-contain opacity-95 drop-shadow-[0_8px_14px_rgba(0,0,0,0.30)]" style={{ bottom: 28, width: `${brothersWidth}%`, transform: `translate(calc(-50% + ${Number(posterBrothersX || 0)}px), ${Number(posterBrothersY || 0)}px)` }} draggable={false} />}
      </div>
    </div>
  );
}

function ShirtPosterPreview({
  shirtTeam,
  shirtName,
  shirtNumber,
  shirtShowMondayLogo,
  shirtShowBrothers,
  shirtShowTeam,
  shirtBgMode,
  shirtCustomBg,
  shirtTextColour,
  shirtNumberColour,
  shirtOutlineEnabled,
  shirtOutlineColour,
  shirtFontWeight,
  shirtFontStyle,
  shirtFontType = "bold",
  shirtShowName = true,
  shirtShowNumber = true,
  shirtOutlineWeight = 2,
  shirtMondayScale,
  shirtNameScale,
  shirtNumberScale,
  shirtBrothersScale,
  shirtNameNumberLocked = false,
  shirtTeamScale = 1,
  shirtTeamX = 0,
  shirtTeamY = 0,
  shirtMondayX = 0,
  shirtMondayY = 0,
  shirtNameX = 0,
  shirtNameY = 0,
  shirtNumberX = 0,
  shirtNumberY = 0,
  shirtBrothersX = 0,
  shirtBrothersY = 0,
}) {
  const kit = teamToGameTeam(shirtTeam);
  const background = shirtBgMode === "custom" ? shirtCustomBg : kit.primaryColour;
  const nameLength = String(shirtName || "").length;
  const nameBase = nameLength > 12 ? 26 : nameLength > 9 ? 32 : 38;
  const lockedScale = shirtNameNumberLocked ? Number(shirtNameScale || 1) : null;
  const nameSize = Math.max(22, Math.min(56, nameBase * Number(lockedScale || shirtNameScale || 1)));
  const numberSize = Math.max(118, Math.min(232, 178 * Number(lockedScale || shirtNumberScale || 1)));
  const mondayHeight = Math.max(24, Math.min(56, 36 * Number(shirtMondayScale || 1)));
  const brothersWidth = Math.max(12, Math.min(28, 16 * Number(shirtBrothersScale || 1)));
  const stroke = shirtOutlineEnabled ? textStroke(shirtOutlineWeight, shirtOutlineColour) : "0 transparent";
  const shirtFontFamily = fontFamilyFor(shirtFontType);
  const centred = (x, y, scale = 1) => mergeTransforms("translate(-50%, -50%)", editorTransform({ x, y, scale }));
  return (
    <div className="relative h-full w-full overflow-hidden text-center text-[#F5F1E8]" style={{ background }}>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(255,255,255,0.14),transparent_31%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(0,0,0,0.065))]" />
      {shirtShowMondayLogo && (
        <div className="absolute left-1/2 top-[15%] z-[2] grid place-items-center" style={{ height: mondayHeight, width: mondayHeight * 1.05, transform: centred(shirtMondayX, shirtMondayY) }}>
          <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.20)]" draggable={false} />
        </div>
      )}
      {shirtShowName && (
        <div className="home-copy-bold absolute left-1/2 top-[39%] z-[2] w-[88%] truncate uppercase leading-none tracking-[0.08em]" style={{ color: shirtTextColour, fontFamily: shirtFontFamily, fontSize: nameSize, fontWeight: shirtFontWeight, fontStyle: shirtFontStyle, WebkitTextStroke: stroke, textShadow: "0 2px 0 rgba(0,0,0,0.12)", transform: centred(shirtNameX, shirtNameY) }}>
          {shirtName || "VAN DUUREN"}
        </div>
      )}
      {shirtShowNumber && (
        <div className="home-copy-bold absolute left-1/2 top-[58%] z-[2] max-w-[92%] uppercase leading-[0.80] tracking-[-0.08em]" style={{ color: shirtNumberColour, fontFamily: shirtFontFamily, fontSize: numberSize, fontWeight: 900, fontStyle: shirtFontStyle, WebkitTextStroke: stroke, textShadow: "0 6px 0 rgba(0,0,0,0.12)", transform: centred(shirtNumberX, shirtNumberY) }}>
          {String(shirtNumber || "99").slice(0, 2)}
        </div>
      )}
      {shirtShowBrothers && (
        <img src={ASSETS.branding.myMundialLogo} alt="Brothers" className="absolute left-1/2 top-[89%] z-[2] object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]" style={{ width: `${brothersWidth}%`, transform: centred(shirtBrothersX, shirtBrothersY) }} draggable={false} />
      )}
    </div>
  );
}

function PitchMow() {
  return <div className="pointer-events-none absolute inset-0" style={PITCH_MOW_BACKGROUND_STYLE} />;
}

function padArray(values = [], length, fallback = []) {
  return Array.from({ length }).map((_, index) => values[index] || fallback[index] || `TEAM ${index + 1}`);
}

function Field({ label, children }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-left">
      <span className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">{label}</span>
      {children}
    </label>
  );
}

const inputClass = "h-10 min-w-0 rounded-[12px] border border-[#F5F1E8]/18 bg-[#051A11]/78 px-3 home-copy-bold text-[12px] font-black uppercase tracking-[0.08em] text-[#F5F1E8] outline-none ring-1 ring-[#0B5F35]/45 focus:border-[#F7D117]/65";
const smallButtonBase = "grid h-9 place-items-center rounded-[12px] border px-2 home-copy-bold text-[10px] font-black uppercase tracking-[0.11em] transition";

function TextInput({ value, onChange, type = "text", min, max }) {
  return <input className={inputClass} type={type} min={min} max={max} value={value} onChange={(event) => onChange(event.target.value)} />;
}

function ColourInput({ value, onChange }) {
  return <input className="h-10 w-full rounded-[12px] border border-[#F5F1E8]/18 bg-[#051A11]/78 p-1" type="color" value={value} onChange={(event) => onChange(event.target.value)} />;
}

function RangeInput({ value, onChange, min = 0.5, max = 1.5, step = 0.05, suffix = "×" }) {
  return (
    <div className="grid h-10 grid-cols-[1fr_44px] items-center gap-2 rounded-[12px] border border-[#F5F1E8]/18 bg-[#051A11]/78 px-3">
      <input className="w-full accent-[#F7D117]" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
      <span className="text-right home-copy-bold text-[10px] font-black uppercase tracking-[0.08em] text-[#F5F1E8]/80">{Number(value).toFixed(step < 0.1 ? 2 : 1)}{suffix}</span>
    </div>
  );
}

function TeamSelect({ value, onChange }) {
  return (
    <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
      {TEAM_OPTIONS.map((teamName) => <option key={teamName} value={teamName}>{teamName}</option>)}
    </select>
  );
}

function SelectInput({ value, onChange, options }) {
  return (
    <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
    </select>
  );
}

function MiniSegment({ options, value, onChange }) {
  return (
    <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button key={option.value} type="button" onClick={() => onChange(option.value)} className={`${smallButtonBase} ${active ? "border-[#F5F1E8]/45 bg-[#F7D117] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.20)]" : "border-[#F5F1E8]/18 bg-[#051A11]/78 text-[#F5F1E8]"}`}>
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function ToggleButton({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`${smallButtonBase} ${active ? "border-[#F5F1E8]/45 bg-[#F7D117] text-[#072D1D]" : "border-[#F5F1E8]/18 bg-[#051A11]/78 text-[#F5F1E8]"}`}>
      {children}
    </button>
  );
}

function CheckboxControl({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className={`flex h-10 items-center justify-start gap-2 rounded-[12px] border px-3 home-copy-bold text-[11px] font-black uppercase tracking-[0.1em] ${checked ? "border-[#F7D117]/70 bg-[#F7D117] text-[#072D1D]" : "border-[#F5F1E8]/18 bg-[#051A11]/78 text-[#F5F1E8]"}`}>
      <span className={`grid h-4 w-4 place-items-center rounded-[4px] border ${checked ? "border-[#072D1D]" : "border-[#F5F1E8]/40"}`}>{checked ? "✓" : ""}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function MarkerControl({ title, markers, totalSlots, onToggle }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">{title}</div>
      <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${totalSlots}, minmax(0, 1fr))` }}>
        {padMarkers(markers, totalSlots).map((marker, index) => {
          const activeClass = marker === "G" ? "border-green-300/80 bg-green-500 text-[#051A11]" : marker === "S" ? "border-red-200/80 bg-red-500 text-white" : "border-[#F5F1E8]/18 bg-[#051A11]/78 text-[#F7D117]";
          return (
            <button key={`${title}-${index}`} type="button" onClick={() => onToggle(index)} className={`${smallButtonBase} ${activeClass}`}>
              {marker || index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function PositionSelect({ value, onChange }) {
  const options = [
    { value: "spot", label: "PEN SPOT" },
    ...DIRECTIONS.map((direction) => ({ value: direction.id, label: `${DIRECTION_TO_SLOT[direction.id]} ${direction.id}` })),
  ];
  return <SelectInput value={value} onChange={onChange} options={options} />;
}

function XYScaleControls({ title, x, setX, y, setY, scale, setScale, xRange = 80, yRange = 80, minScale = 0.5, maxScale = 1.8 }) {
  return (
    <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 sm:grid-cols-3">
      <div className="sm:col-span-3 home-copy-bold text-[10px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/72">{title}</div>
      <Field label="X"><RangeInput value={x} onChange={setX} min={-xRange} max={xRange} step={1} suffix="px" /></Field>
      <Field label="Y"><RangeInput value={y} onChange={setY} min={-yRange} max={yRange} step={1} suffix="px" /></Field>
      {setScale && <Field label="Scale"><RangeInput value={scale} onChange={setScale} min={minScale} max={maxScale} step={0.05} /></Field>}
    </div>
  );
}

export function ShareScreen({
  menuProps = {},
  team = "Ghana",
  opponent = "France",
  score = [0, 0],
  matchResult = null,
  stageLabel = "FINAL",
}) {
  const frameRef = useRef(null);
  const [shareBusy, setShareBusy] = useState(false);

  const initialTeamA = team || matchResult?.home || "Ghana";
  const initialTeamB = opponent || matchResult?.away || "France";
  const initialScore = scoreFromProps({ team: initialTeamA, opponent: initialTeamB, score, matchResult });
  const initialTicker = previewTicker({ team: initialTeamA, opponent: initialTeamB, matchResult });

  const [exportIndex, setExportIndex] = useState(0);
  const [teamA, setTeamA] = useState(initialTeamA);
  const [teamB, setTeamB] = useState(initialTeamB);
  const [scoreA, setScoreA] = useState(initialScore.user);
  const [scoreB, setScoreB] = useState(initialScore.opponent);
  const [stageTitle, setStageTitle] = useState(stageLabel || "FINAL");
  const [editMatchState, setEditMatchState] = useState(false);
  const [suddenDeathSlots, setSuddenDeathSlots] = useState(0);
  const [showMarkers, setShowMarkers] = useState(true);
  const [markerText, setMarkerText] = useState("PENS 5-4");
  const [usernameEnabled, setUsernameEnabled] = useState(false);
  const [username, setUsername] = useState("MYMUNDIAL");
  const [teamAMarkers, setTeamAMarkers] = useState(() => initialAttemptSequence(matchResult?.attempts?.user, initialScore.user));
  const [teamBMarkers, setTeamBMarkers] = useState(() => initialAttemptSequence(matchResult?.attempts?.opponent, initialScore.opponent));
  const [flashText, setFlashText] = useState(initialTicker);
  const [flashBgMode, setFlashBgMode] = useState("teamA");
  const [customFlashBg, setCustomFlashBg] = useState(LED_YELLOW);
  const [flashFontColour, setFlashFontColour] = useState(IVORY);
  const [crowdStage, setCrowdStage] = useState(stageLabel || "FINAL");
  const [badgeMode, setBadgeMode] = useState("none");
  const [showGoalkeeper, setShowGoalkeeper] = useState(false);
  const [goalkeeperPosition, setGoalkeeperPosition] = useState("CM");
  const [showBall, setShowBall] = useState(false);
  const [ballPosition, setBallPosition] = useState("spot");
  const [matchScoreboardHeight, setMatchScoreboardHeight] = useState(34);
  const [matchTextColour, setMatchTextColour] = useState(LED_YELLOW);
  const [matchFontType, setMatchFontType] = useState("led");
  const [matchOutlineWeight, setMatchOutlineWeight] = useState(0);
  const [matchOutlineColour, setMatchOutlineColour] = useState(DARK_GREEN);
  const [matchShowStage, setMatchShowStage] = useState(true);
  const [matchStageBox, setMatchStageBox] = useState(true);
  const [matchStageScale, setMatchStageScale] = useState(1);
  const [matchStageX, setMatchStageX] = useState(0);
  const [matchStageY, setMatchStageY] = useState(0);
  const [matchShowFlags, setMatchShowFlags] = useState(true);
  const [matchFlagScale, setMatchFlagScale] = useState(1);
  const [matchFlagAX, setMatchFlagAX] = useState(0);
  const [matchFlagAY, setMatchFlagAY] = useState(0);
  const [matchFlagBX, setMatchFlagBX] = useState(0);
  const [matchFlagBY, setMatchFlagBY] = useState(0);
  const [matchShowTeamCodes, setMatchShowTeamCodes] = useState(true);
  const [matchTeamScale, setMatchTeamScale] = useState(1);
  const [matchTeamAX, setMatchTeamAX] = useState(0);
  const [matchTeamAY, setMatchTeamAY] = useState(0);
  const [matchTeamBX, setMatchTeamBX] = useState(0);
  const [matchTeamBY, setMatchTeamBY] = useState(0);
  const [matchShowScore, setMatchShowScore] = useState(true);
  const [matchScoreDisplayMode, setMatchScoreDisplayMode] = useState("score");
  const [matchBorderEnabled, setMatchBorderEnabled] = useState(true);
  const [matchBorderColour, setMatchBorderColour] = useState("#0B5F35");
  const [matchScoreScale, setMatchScoreScale] = useState(1);
  const [matchScoreX, setMatchScoreX] = useState(0);
  const [matchScoreY, setMatchScoreY] = useState(0);
  const [matchMarkerBox, setMatchMarkerBox] = useState(true);
  const [matchMarkerScale, setMatchMarkerScale] = useState(1);
  const [matchMarkerAX, setMatchMarkerAX] = useState(0);
  const [matchMarkerAY, setMatchMarkerAY] = useState(0);
  const [matchMarkerBX, setMatchMarkerBX] = useState(0);
  const [matchMarkerBY, setMatchMarkerBY] = useState(0);
  const [matchUsernameScale, setMatchUsernameScale] = useState(1);
  const [matchUsernameX, setMatchUsernameX] = useState(0);
  const [matchUsernameY, setMatchUsernameY] = useState(0);
  const [matchFlashBox, setMatchFlashBox] = useState(true);
  const [matchFlashScale, setMatchFlashScale] = useState(1);
  const [matchFlashX, setMatchFlashX] = useState(0);
  const [matchFlashY, setMatchFlashY] = useState(0);
  const [matchFlashFontType, setMatchFlashFontType] = useState("bold");
  const [matchFlashOutlineWeight, setMatchFlashOutlineWeight] = useState(0);
  const [matchFlashOutlineColour, setMatchFlashOutlineColour] = useState(DARK_GREEN);
  const [matchBadgeScale, setMatchBadgeScale] = useState(1);
  const [matchBadgeX, setMatchBadgeX] = useState(0);
  const [matchBadgeY, setMatchBadgeY] = useState(0);
  const [matchGoalkeeperScale, setMatchGoalkeeperScale] = useState(1);
  const [matchBallScale, setMatchBallScale] = useState(1);
  const [matchPitchHeight, setMatchPitchHeight] = useState(620);

  const [posterTitle, setPosterTitle] = useState("COMING SOON");
  const [posterSubtitle, setPosterSubtitle] = useState("");
  const [posterSecondSubtitle, setPosterSecondSubtitle] = useState("");
  const [posterShowLogo, setPosterShowLogo] = useState(true);
  const [posterLogoGlow, setPosterLogoGlow] = useState(true);
  const [posterLogoShadow, setPosterLogoShadow] = useState(false);
  const [posterBgMode, setPosterBgMode] = useState("pitch");
  const [posterBgTeam, setPosterBgTeam] = useState(initialTeamA);
  const [posterCustomBg, setPosterCustomBg] = useState(DARK_GREEN);
  const [posterFontColour, setPosterFontColour] = useState(LED_YELLOW);
  const [posterTitleFontType, setPosterTitleFontType] = useState("led");
  const [posterSubtitleFontType, setPosterSubtitleFontType] = useState("bold");
  const [posterSecondSubtitleFontType, setPosterSecondSubtitleFontType] = useState("bold");
  const [posterShowBrothers, setPosterShowBrothers] = useState(true);
  const [posterLogoScale, setPosterLogoScale] = useState(1);
  const [posterTitleScale, setPosterTitleScale] = useState(1);
  const [posterSubtitleScale, setPosterSubtitleScale] = useState(1);
  const [posterSecondSubtitleScale, setPosterSecondSubtitleScale] = useState(1);
  const [posterBrothersScale, setPosterBrothersScale] = useState(1);
  const [posterLogoY, setPosterLogoY] = useState(0);
  const [posterTitleY, setPosterTitleY] = useState(0);
  const [posterSubtitleY, setPosterSubtitleY] = useState(0);
  const [posterSecondSubtitleY, setPosterSecondSubtitleY] = useState(0);
  const [posterBrothersY, setPosterBrothersY] = useState(0);
  const [posterLogoX, setPosterLogoX] = useState(0);
  const [posterTitleX, setPosterTitleX] = useState(0);
  const [posterSubtitleX, setPosterSubtitleX] = useState(0);
  const [posterSecondSubtitleX, setPosterSecondSubtitleX] = useState(0);
  const [posterBrothersX, setPosterBrothersX] = useState(0);
  const [posterTitleColour, setPosterTitleColour] = useState(LED_YELLOW);
  const [posterSubtitleColour, setPosterSubtitleColour] = useState(IVORY);
  const [posterSecondSubtitleColour, setPosterSecondSubtitleColour] = useState(IVORY);
  const [posterOutlineWeight, setPosterOutlineWeight] = useState(0);
  const [posterOutlineColour, setPosterOutlineColour] = useState(DARK_GREEN);
  const [posterGlowColour, setPosterGlowColour] = useState(LED_YELLOW);
  const [posterGlowOpacity, setPosterGlowOpacity] = useState(0.3);
  const [posterGlowBrightness, setPosterGlowBrightness] = useState(1.1);
  const [posterShadowOpacity, setPosterShadowOpacity] = useState(0.3);

  const [bracketTitle, setBracketTitle] = useState("ROAD TO THE FINAL");
  const [bracketChampion, setBracketChampion] = useState(initialTeamA);

  const [shirtTeam, setShirtTeam] = useState(initialTeamA);
  const [shirtName, setShirtName] = useState("VAN DUUREN");
  const [shirtNumber, setShirtNumber] = useState("99");
  const [shirtShowMondayLogo, setShirtShowMondayLogo] = useState(true);
  const [shirtShowBrothers, setShirtShowBrothers] = useState(true);
  const [shirtShowTeam, setShirtShowTeam] = useState(false);
  const [shirtShowName, setShirtShowName] = useState(true);
  const [shirtShowNumber, setShirtShowNumber] = useState(true);
  const [shirtBgMode, setShirtBgMode] = useState("team");
  const [shirtCustomBg, setShirtCustomBg] = useState("#00A9E0");
  const [shirtTextColour, setShirtTextColour] = useState("#101010");
  const [shirtNumberColour, setShirtNumberColour] = useState("#101010");
  const [shirtOutlineEnabled, setShirtOutlineEnabled] = useState(false);
  const [shirtOutlineColour, setShirtOutlineColour] = useState("#F5F1E8");
  const [shirtFontWeight, setShirtFontWeight] = useState("900");
  const [shirtFontStyle, setShirtFontStyle] = useState("normal");
  const [shirtFontType, setShirtFontType] = useState("bold");
  const [shirtOutlineWeight, setShirtOutlineWeight] = useState(2);
  const [shirtMondayScale, setShirtMondayScale] = useState(0.82);
  const [shirtNameScale, setShirtNameScale] = useState(1.12);
  const [shirtNumberScale, setShirtNumberScale] = useState(1.12);
  const [shirtNameNumberLocked, setShirtNameNumberLocked] = useState(true);
  const [shirtBrothersScale, setShirtBrothersScale] = useState(0.78);
  const [shirtTeamScale, setShirtTeamScale] = useState(1);
  const [shirtTeamX, setShirtTeamX] = useState(0);
  const [shirtTeamY, setShirtTeamY] = useState(0);
  const [shirtMondayX, setShirtMondayX] = useState(0);
  const [shirtMondayY, setShirtMondayY] = useState(0);
  const [shirtNameX, setShirtNameX] = useState(0);
  const [shirtNameY, setShirtNameY] = useState(-8);
  const [shirtNumberX, setShirtNumberX] = useState(0);
  const [shirtNumberY, setShirtNumberY] = useState(-10);
  const [shirtBrothersX, setShirtBrothersX] = useState(0);
  const [shirtBrothersY, setShirtBrothersY] = useState(0);

  const setLockedShirtNameScale = (value) => {
    setShirtNameScale(value);
    if (shirtNameNumberLocked) setShirtNumberScale(value);
  };
  const setLockedShirtNumberScale = (value) => {
    setShirtNumberScale(value);
    if (shirtNameNumberLocked) setShirtNameScale(value);
  };
  const setShirtNameNumberScale = (value) => {
    setShirtNameScale(value);
    setShirtNumberScale(value);
  };

  const activeState = EXPORT_STATES[exportIndex];
  const userTeam = useMemo(() => teamToGameTeam(teamA), [teamA]);
  const opponentTeam = useMemo(() => teamToGameTeam(teamB), [teamB]);
  const totalMarkerSlots = GAME.regulationPens + Number(suddenDeathSlots || 0);
  const bracketTeams = useMemo(() => [teamA, teamB, "Brazil", "England", "Canada", "Spain", "Argentina", "Portugal"], [teamA, teamB]);

  const flashBackground = flashBgMode === "teamA"
    ? userTeam.primaryColour
    : flashBgMode === "teamB"
      ? opponentTeam.primaryColour
      : flashBgMode === "yellow"
        ? LED_YELLOW
        : flashBgMode === "dark"
          ? DARK_GREEN
          : customFlashBg;
  const flashStyle = { background: flashBackground, color: flashFontColour };
  const matchDesign = {
    scoreboardHeight: matchScoreboardHeight,
    textColour: matchTextColour,
    fontType: matchFontType,
    outlineWeight: matchOutlineWeight,
    outlineColour: matchOutlineColour,
    showStage: matchShowStage,
    stageBox: matchStageBox,
    stageScale: matchStageScale,
    stageX: matchStageX,
    stageY: matchStageY,
    showFlags: matchShowFlags,
    flagScale: matchFlagScale,
    flagAX: matchFlagAX,
    flagAY: matchFlagAY,
    flagBX: matchFlagBX,
    flagBY: matchFlagBY,
    showTeamCodes: matchShowTeamCodes,
    teamScale: matchTeamScale,
    teamAX: matchTeamAX,
    teamAY: matchTeamAY,
    teamBX: matchTeamBX,
    teamBY: matchTeamBY,
    showScore: matchShowScore,
    scoreDisplayMode: matchScoreDisplayMode,
    scoreScale: matchScoreScale,
    scoreX: matchScoreX,
    scoreY: matchScoreY,
    markerBox: matchMarkerBox,
    markerScale: matchMarkerScale,
    markerAX: matchMarkerAX,
    markerAY: matchMarkerAY,
    markerBX: matchMarkerBX,
    markerBY: matchMarkerBY,
    usernameScale: matchUsernameScale,
    usernameX: matchUsernameX,
    usernameY: matchUsernameY,
    flashBox: matchFlashBox,
    flashScale: matchFlashScale,
    flashX: matchFlashX,
    flashY: matchFlashY,
    flashFontType: matchFlashFontType,
    flashOutlineWeight: matchFlashOutlineWeight,
    flashOutlineColour: matchFlashOutlineColour,
    badgeScale: matchBadgeScale,
    badgeX: matchBadgeX,
    badgeY: matchBadgeY,
    goalkeeperScale: matchGoalkeeperScale,
    ballScale: matchBallScale,
    pitchHeight: matchPitchHeight,
  };

  const updateExportIndex = (delta) => {
    setExportIndex((current) => (current + delta + EXPORT_STATES.length) % EXPORT_STATES.length);
  };

  const toggleMarker = (teamKey, index) => {
    const setter = teamKey === "A" ? setTeamAMarkers : setTeamBMarkers;
    setter((current) => {
      const next = padMarkers(current, totalMarkerSlots);
      next[index] = next[index] === "" ? "G" : next[index] === "G" ? "S" : "";
      return next;
    });
  };

  const resetPoster = () => {
    setPosterTitle("COMING SOON");
    setPosterSubtitle("");
    setPosterSecondSubtitle("");
    setPosterShowLogo(true);
    setPosterLogoGlow(true);
    setPosterLogoShadow(false);
    setPosterBgMode("pitch");
    setPosterBgTeam(initialTeamA);
    setPosterCustomBg(DARK_GREEN);
    setPosterFontColour(LED_YELLOW);
    setPosterTitleFontType("led");
    setPosterSubtitleFontType("bold");
    setPosterSecondSubtitleFontType("bold");
    setPosterShowBrothers(true);
    setPosterLogoScale(1);
    setPosterTitleScale(1);
    setPosterSubtitleScale(1);
    setPosterSecondSubtitleScale(1);
    setPosterBrothersScale(1);
    setPosterLogoY(0);
    setPosterTitleY(0);
    setPosterSubtitleY(0);
    setPosterSecondSubtitleY(0);
    setPosterBrothersY(0);
    setPosterLogoX(0);
    setPosterTitleX(0);
    setPosterSubtitleX(0);
    setPosterSecondSubtitleX(0);
    setPosterBrothersX(0);
    setPosterTitleColour(LED_YELLOW);
    setPosterSubtitleColour(IVORY);
    setPosterSecondSubtitleColour(IVORY);
    setPosterOutlineWeight(0);
    setPosterOutlineColour(DARK_GREEN);
    setPosterGlowColour(LED_YELLOW);
    setPosterGlowOpacity(0.3);
    setPosterGlowBrightness(1.1);
    setPosterShadowOpacity(0.3);
  };

  const handleExport = async () => {
    if (!frameRef.current || shareBusy) return;
    const previewWindow = reserveShareWindow();
    setShareBusy(true);
    try {
      const blob = await captureShareElementBlob(frameRef.current, teamA);
      await shareOrDownloadResult({ blob, filename: `monday-cup-${activeState.id}-share.png`, previewWindow });
    } catch (error) {
      if (previewWindow && !previewWindow.closed) previewWindow.close();
      console.error("Share page export failed", error);
      window.alert("Sorry, the share preview could not be exported. Please try again.");
    } finally {
      setShareBusy(false);
    }
  };

  return (
    <main className="home-main-font relative z-[1] flex h-full min-h-0 w-full flex-col overflow-hidden text-[#F5F1E8]">
      <PitchPageBackground />
      <ScreenTopBar {...menuProps}>SHARE</ScreenTopBar>
      <section className="relative z-[1] flex min-h-0 flex-1 flex-col items-center overflow-auto px-4 pb-24 pt-4">
        <div className={`${SHARE_PREVIEW_CLASS} mb-2 grid grid-cols-[44px_1fr_44px] items-center gap-2 text-center`}>
          <button type="button" onClick={() => updateExportIndex(-1)} className="grid h-10 w-10 place-items-center rounded-[12px] border border-[#F5F1E8]/20 bg-[#051A11]/76 text-[25px] leading-none text-[#F7D117] shadow-[0_8px_18px_rgba(0,0,0,0.22)] backdrop-blur-[2px]" aria-label="Previous export state">‹</button>
          <div className="min-w-0">
            <div className="home-copy-bold text-[10px] font-black uppercase tracking-[0.2em] text-[#F5F1E8]/68">EXPORT STATE</div>
            <div className="led-text-glow font-led mt-1 truncate text-[18px] font-black uppercase tracking-[0.16em] text-[#F7D117]">{activeState.label}</div>
          </div>
          <button type="button" onClick={() => updateExportIndex(1)} className="grid h-10 w-10 place-items-center rounded-[12px] border border-[#F5F1E8]/20 bg-[#051A11]/76 text-[25px] leading-none text-[#F7D117] shadow-[0_8px_18px_rgba(0,0,0,0.22)] backdrop-blur-[2px]" aria-label="Next export state">›</button>
        </div>

        <div className={`${SHARE_PREVIEW_CLASS} relative aspect-square`}>
          <div
            ref={frameRef}
            data-share-layout={activeState.id}
            className="absolute inset-0 overflow-hidden bg-[#0d6c3d] shadow-[0_14px_30px_rgba(0,0,0,0.24),inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#F7D117]/24"
            style={{
              backgroundColor: "#0d6c3d",
              border: activeState.id === "match" && matchBorderEnabled ? `3px solid ${matchBorderColour}` : "1px solid rgba(245,241,232,0.22)",
            }}
          >
            {activeState.id === "match" && (
              <ShareMatchPreview
                userTeam={userTeam}
                opponentTeam={opponentTeam}
                score={{ user: scoreA, opponent: scoreB }}
                stageTitle={stageTitle}
                flashText={flashText}
                flashStyle={flashStyle}
                crowdStage={crowdStage}
                showMarkers={showMarkers}
                markerText={markerText}
                usernameEnabled={usernameEnabled}
                username={username}
                teamAMarkers={teamAMarkers}
                teamBMarkers={teamBMarkers}
                totalMarkerSlots={totalMarkerSlots}
                badgeMode={badgeMode}
                showGoalkeeper={showGoalkeeper}
                goalkeeperPosition={goalkeeperPosition}
                showBall={showBall}
                ballPosition={ballPosition}
                matchDesign={matchDesign}
              />
            )}
            {activeState.id === "bracket" && <BracketPreview bracketTitle={bracketTitle} bracketTeams={bracketTeams} champion={bracketChampion} />}
            {activeState.id === "poster" && (
              <PosterPreview
                posterTitle={posterTitle}
                posterSubtitle={posterSubtitle}
                posterSecondSubtitle={posterSecondSubtitle}
                posterShowLogo={posterShowLogo}
                posterLogoGlow={posterLogoGlow}
                posterLogoShadow={posterLogoShadow}
                posterBgMode={posterBgMode}
                posterBgTeam={posterBgTeam}
                posterCustomBg={posterCustomBg}
                posterFontColour={posterFontColour}
                posterTitleFontType={posterTitleFontType}
                posterSubtitleFontType={posterSubtitleFontType}
                posterSecondSubtitleFontType={posterSecondSubtitleFontType}
                posterShowBrothers={posterShowBrothers}
                posterLogoScale={posterLogoScale}
                posterTitleScale={posterTitleScale}
                posterSubtitleScale={posterSubtitleScale}
                posterSecondSubtitleScale={posterSecondSubtitleScale}
                posterBrothersScale={posterBrothersScale}
                posterLogoY={posterLogoY}
                posterTitleY={posterTitleY}
                posterSubtitleY={posterSubtitleY}
                posterSecondSubtitleY={posterSecondSubtitleY}
                posterBrothersY={posterBrothersY}
                posterLogoX={posterLogoX}
                posterTitleX={posterTitleX}
                posterSubtitleX={posterSubtitleX}
                posterSecondSubtitleX={posterSecondSubtitleX}
                posterBrothersX={posterBrothersX}
                posterTitleColour={posterTitleColour}
                posterSubtitleColour={posterSubtitleColour}
                posterSecondSubtitleColour={posterSecondSubtitleColour}
                posterOutlineWeight={posterOutlineWeight}
                posterOutlineColour={posterOutlineColour}
                posterGlowColour={posterGlowColour}
                posterGlowOpacity={posterGlowOpacity}
                posterGlowBrightness={posterGlowBrightness}
                posterShadowOpacity={posterShadowOpacity}
              />
            )}
            {activeState.id === "shirt" && (
              <ShirtPosterPreview
                shirtTeam={shirtTeam}
                shirtName={shirtName}
                shirtNumber={shirtNumber}
                shirtShowMondayLogo={shirtShowMondayLogo}
                shirtShowBrothers={shirtShowBrothers}
                shirtShowTeam={shirtShowTeam}
                shirtShowName={shirtShowName}
                shirtShowNumber={shirtShowNumber}
                shirtBgMode={shirtBgMode}
                shirtCustomBg={shirtCustomBg}
                shirtTextColour={shirtTextColour}
                shirtNumberColour={shirtNumberColour}
                shirtOutlineEnabled={shirtOutlineEnabled}
                shirtOutlineColour={shirtOutlineColour}
                shirtFontWeight={shirtFontWeight}
                shirtFontStyle={shirtFontStyle}
                shirtFontType={shirtFontType}
                shirtOutlineWeight={shirtOutlineWeight}
                shirtMondayScale={shirtMondayScale}
                shirtNameScale={shirtNameScale}
                shirtNumberScale={shirtNumberScale}
                shirtBrothersScale={shirtBrothersScale}
                shirtNameNumberLocked={shirtNameNumberLocked}
                shirtTeamScale={shirtTeamScale}
                shirtTeamX={shirtTeamX}
                shirtTeamY={shirtTeamY}
                shirtMondayX={shirtMondayX}
                shirtMondayY={shirtMondayY}
                shirtNameX={shirtNameX}
                shirtNameY={shirtNameY}
                shirtNumberX={shirtNumberX}
                shirtNumberY={shirtNumberY}
                shirtBrothersX={shirtBrothersX}
                shirtBrothersY={shirtBrothersY}
              />
            )}
          </div>
        </div>

        <div className={`${SHARE_PREVIEW_CLASS} mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]`}>
          <button type="button" onClick={handleExport} disabled={shareBusy} className="grid h-[50px] min-h-[50px] place-items-center rounded-[16px] border border-[#F5F1E8]/45 bg-[#F7D117] px-4 text-center home-copy-bold text-[16px] font-black uppercase leading-none tracking-[0.14em] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.26),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65">
            {shareBusy ? "PREPARING" : "SAVE AS PHOTO"}
          </button>
          <div className="grid h-[50px] place-items-center rounded-[16px] border border-[#F5F1E8]/16 bg-[#051A11]/70 px-4 home-copy-bold text-[11px] font-black uppercase tracking-[0.16em] text-[#F5F1E8]/70">
            400 x 400 PREVIEW
          </div>
        </div>

        <div className={`${SHARE_PREVIEW_CLASS} mt-4 rounded-[18px] border border-[#F5F1E8]/14 bg-[#072D1D]/84 p-3 shadow-[0_16px_34px_rgba(0,0,0,0.25),inset_0_1px_0_rgba(245,241,232,0.06)] sm:p-4`}>
          {activeState.id === "match" && (
            <div className="grid gap-4">
              <CheckboxControl checked={editMatchState} onChange={setEditMatchState} label="Edit starting state" />
              {!editMatchState ? (
                <div className="home-copy-bold rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 text-[11px] font-black uppercase leading-relaxed tracking-[0.12em] text-[#F5F1E8]/66">
                  Using current campaign screen state. Turn edit on to customise the export.
                </div>
              ) : (
                <>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Team A"><TeamSelect value={teamA} onChange={setTeamA} /></Field>
                    <Field label="Team B"><TeamSelect value={teamB} onChange={setTeamB} /></Field>
                    <Field label="Team A score"><TextInput type="number" min="0" max="99" value={scoreA} onChange={(value) => setScoreA(Number(value) || 0)} /></Field>
                    <Field label="Team B score"><TextInput type="number" min="0" max="99" value={scoreB} onChange={(value) => setScoreB(Number(value) || 0)} /></Field>
                    <Field label="Score display"><MiniSegment options={SCORE_DISPLAY_OPTIONS} value={matchScoreDisplayMode} onChange={setMatchScoreDisplayMode} /></Field>
                    <Field label="Round title"><TextInput value={stageTitle} onChange={setStageTitle} /></Field>
                    <Field label="Crowd density"><MiniSegment options={CROWD_OPTIONS} value={crowdStage} onChange={setCrowdStage} /></Field>
                  </div>

                  <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Penalty markers"><ToggleButton active={showMarkers} onClick={() => setShowMarkers((value) => !value)}>{showMarkers ? "ON" : "TEXT"}</ToggleButton></Field>
                      <Field label="SD options"><MiniSegment options={SD_OPTIONS.map((value) => ({ value, label: value ? `+${value}` : "0" }))} value={suddenDeathSlots} onChange={setSuddenDeathSlots} /></Field>
                      <Field label="Username"><ToggleButton active={usernameEnabled} onClick={() => setUsernameEnabled((value) => !value)}>{usernameEnabled ? "ON" : "OFF"}</ToggleButton></Field>
                    </div>
                    {showMarkers ? (
                      <div className="grid gap-3">
                        <MarkerControl title={`${teamA} sequence`} markers={teamAMarkers} totalSlots={totalMarkerSlots} onToggle={(index) => toggleMarker("A", index)} />
                        <MarkerControl title={`${teamB} sequence`} markers={teamBMarkers} totalSlots={totalMarkerSlots} onToggle={(index) => toggleMarker("B", index)} />
                        {usernameEnabled && <Field label="Username text"><TextInput value={username} onChange={setUsername} /></Field>}
                      </div>
                    ) : (
                      <Field label="Penalty text"><TextInput value={markerText} onChange={setMarkerText} /></Field>
                    )}
                  </div>

                  <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3">
                    <Field label="Flash commentary"><TextInput value={flashText} onChange={setFlashText} /></Field>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Field label="Team colour"><SelectInput value={flashBgMode} onChange={setFlashBgMode} options={FLASH_BG_OPTIONS} /></Field>
                      <Field label="Custom bg"><ColourInput value={customFlashBg} onChange={setCustomFlashBg} /></Field>
                      <Field label="Font colour"><ColourInput value={flashFontColour} onChange={setFlashFontColour} /></Field>
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Pitch badge"><SelectInput value={badgeMode} onChange={setBadgeMode} options={BADGE_OPTIONS} /></Field>
                      <Field label="Goalkeeper"><ToggleButton active={showGoalkeeper} onClick={() => setShowGoalkeeper((value) => !value)}>{showGoalkeeper ? "ON" : "OFF"}</ToggleButton></Field>
                      {showGoalkeeper && <Field label="GK position"><PositionSelect value={goalkeeperPosition} onChange={setGoalkeeperPosition} /></Field>}
                      <Field label="Ball"><ToggleButton active={showBall} onClick={() => setShowBall((value) => !value)}>{showBall ? "ON" : "OFF"}</ToggleButton></Field>
                      {showBall && <Field label="Ball position"><PositionSelect value={ballPosition} onChange={setBallPosition} /></Field>}
                    </div>
                  </div>

                  <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 sm:grid-cols-2">
                    <Field label="Scoreboard height"><RangeInput value={matchScoreboardHeight} onChange={setMatchScoreboardHeight} min={24} max={46} step={1} suffix="%" /></Field>
                    <Field label="Pitch crop height"><RangeInput value={matchPitchHeight} onChange={setMatchPitchHeight} min={500} max={760} step={10} suffix="px" /></Field>
                    <Field label="Scoreboard colour"><ColourInput value={matchTextColour} onChange={setMatchTextColour} /></Field>
                    <Field label="Scoreboard font"><SelectInput value={matchFontType} onChange={setMatchFontType} options={FONT_OPTIONS} /></Field>
                    <Field label="Outline colour"><ColourInput value={matchOutlineColour} onChange={setMatchOutlineColour} /></Field>
                    <Field label="Outline weight"><RangeInput value={matchOutlineWeight} onChange={setMatchOutlineWeight} min={0} max={4} step={0.25} suffix="px" /></Field>
                    <Field label="Border colour"><ColourInput value={matchBorderColour} onChange={setMatchBorderColour} /></Field>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2">
                    <CheckboxControl checked={matchShowStage} onChange={setMatchShowStage} label="Round title" />
                    <CheckboxControl checked={matchStageBox} onChange={setMatchStageBox} label="Round title box" />
                    <CheckboxControl checked={matchShowFlags} onChange={setMatchShowFlags} label="Flags" />
                    <CheckboxControl checked={matchShowTeamCodes} onChange={setMatchShowTeamCodes} label="Team codes" />
                    <CheckboxControl checked={matchShowScore} onChange={setMatchShowScore} label="Score/VS text" />
                    <CheckboxControl checked={matchBorderEnabled} onChange={setMatchBorderEnabled} label="Export border" />
                    <CheckboxControl checked={matchMarkerBox} onChange={setMatchMarkerBox} label="Marker/text boxes" />
                    <CheckboxControl checked={matchFlashBox} onChange={setMatchFlashBox} label="Flash box" />
                  </div>

                  <XYScaleControls title="Round title position" x={matchStageX} setX={setMatchStageX} y={matchStageY} setY={setMatchStageY} scale={matchStageScale} setScale={setMatchStageScale} xRange={60} yRange={30} minScale={0.6} maxScale={1.8} />
                  <XYScaleControls title="Team A code position" x={matchTeamAX} setX={setMatchTeamAX} y={matchTeamAY} setY={setMatchTeamAY} scale={matchTeamScale} setScale={setMatchTeamScale} xRange={50} yRange={30} minScale={0.55} maxScale={1.7} />
                  <XYScaleControls title="Team B code position" x={matchTeamBX} setX={setMatchTeamBX} y={matchTeamBY} setY={setMatchTeamBY} scale={matchTeamScale} setScale={setMatchTeamScale} xRange={50} yRange={30} minScale={0.55} maxScale={1.7} />
                  <XYScaleControls title="Score position" x={matchScoreX} setX={setMatchScoreX} y={matchScoreY} setY={setMatchScoreY} scale={matchScoreScale} setScale={setMatchScoreScale} xRange={45} yRange={30} minScale={0.6} maxScale={1.8} />
                  <XYScaleControls title="Team A flag position" x={matchFlagAX} setX={setMatchFlagAX} y={matchFlagAY} setY={setMatchFlagAY} scale={matchFlagScale} setScale={setMatchFlagScale} xRange={40} yRange={30} minScale={0.55} maxScale={1.8} />
                  <XYScaleControls title="Team B flag position" x={matchFlagBX} setX={setMatchFlagBX} y={matchFlagBY} setY={setMatchFlagBY} scale={matchFlagScale} setScale={setMatchFlagScale} xRange={40} yRange={30} minScale={0.55} maxScale={1.8} />
                  <XYScaleControls title="Team A markers/text" x={matchMarkerAX} setX={setMatchMarkerAX} y={matchMarkerAY} setY={setMatchMarkerAY} scale={matchMarkerScale} setScale={setMatchMarkerScale} xRange={60} yRange={30} minScale={0.55} maxScale={1.8} />
                  <XYScaleControls title="Team B markers" x={matchMarkerBX} setX={setMatchMarkerBX} y={matchMarkerBY} setY={setMatchMarkerBY} scale={matchMarkerScale} setScale={setMatchMarkerScale} xRange={60} yRange={30} minScale={0.55} maxScale={1.8} />
                  <XYScaleControls title="Username" x={matchUsernameX} setX={setMatchUsernameX} y={matchUsernameY} setY={setMatchUsernameY} scale={matchUsernameScale} setScale={setMatchUsernameScale} xRange={60} yRange={30} minScale={0.55} maxScale={1.8} />

                  <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 sm:grid-cols-2">
                    <Field label="Flash font"><SelectInput value={matchFlashFontType} onChange={setMatchFlashFontType} options={FONT_OPTIONS} /></Field>
                    <Field label="Flash outline colour"><ColourInput value={matchFlashOutlineColour} onChange={setMatchFlashOutlineColour} /></Field>
                    <Field label="Flash outline weight"><RangeInput value={matchFlashOutlineWeight} onChange={setMatchFlashOutlineWeight} min={0} max={4} step={0.25} suffix="px" /></Field>
                  </div>
                  <XYScaleControls title="Flash text" x={matchFlashX} setX={setMatchFlashX} y={matchFlashY} setY={setMatchFlashY} scale={matchFlashScale} setScale={setMatchFlashScale} xRange={80} yRange={28} minScale={0.55} maxScale={1.8} />
                  <XYScaleControls title="Pitch badge/logo" x={matchBadgeX} setX={setMatchBadgeX} y={matchBadgeY} setY={setMatchBadgeY} scale={matchBadgeScale} setScale={setMatchBadgeScale} xRange={100} yRange={100} minScale={0.4} maxScale={2.2} />
                  <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 sm:grid-cols-2">
                    <Field label="Goalkeeper scale"><RangeInput value={matchGoalkeeperScale} onChange={setMatchGoalkeeperScale} min={0.45} max={2} step={0.05} /></Field>
                    <Field label="Ball scale"><RangeInput value={matchBallScale} onChange={setMatchBallScale} min={0.45} max={2} step={0.05} /></Field>
                  </div>
                </>
              )}
            </div>
          )}

          {activeState.id === "bracket" && (
            <div className="grid gap-3">
              <Field label="Bracket title"><TextInput value={bracketTitle} onChange={setBracketTitle} /></Field>
              <Field label="Champion"><TeamSelect value={bracketChampion} onChange={setBracketChampion} /></Field>
              <div className="home-copy-bold text-[11px] font-black uppercase leading-relaxed tracking-[0.14em] text-[#F5F1E8]/66">Bracket state uses the current Team A and Team B plus fixed QF placeholders for now.</div>
            </div>
          )}

          {activeState.id === "poster" && (
            <div className="grid gap-3">
              <button type="button" onClick={resetPoster} className="grid h-10 place-items-center rounded-[12px] border border-[#F7D117]/55 bg-[#F7D117] px-3 home-copy-bold text-[11px] font-black uppercase tracking-[0.13em] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.18)]">Reset poster</button>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Main text"><TextInput value={posterTitle} onChange={setPosterTitle} /></Field>
                <Field label="Subtitle"><TextInput value={posterSubtitle} onChange={setPosterSubtitle} /></Field>
                <Field label="Second subtitle"><TextInput value={posterSecondSubtitle} onChange={setPosterSecondSubtitle} /></Field>
                <Field label="Background"><SelectInput value={posterBgMode} onChange={setPosterBgMode} options={BG_OPTIONS} /></Field>
                <Field label="Team colour"><TeamSelect value={posterBgTeam} onChange={setPosterBgTeam} /></Field>
                <Field label="Custom bg"><ColourInput value={posterCustomBg} onChange={setPosterCustomBg} /></Field>
                <Field label="Base font colour"><ColourInput value={posterFontColour} onChange={setPosterFontColour} /></Field>
                <Field label="Main colour"><ColourInput value={posterTitleColour} onChange={setPosterTitleColour} /></Field>
                <Field label="Subtitle colour"><ColourInput value={posterSubtitleColour} onChange={setPosterSubtitleColour} /></Field>
                <Field label="Second colour"><ColourInput value={posterSecondSubtitleColour} onChange={setPosterSecondSubtitleColour} /></Field>
                <Field label="Main font"><SelectInput value={posterTitleFontType} onChange={setPosterTitleFontType} options={FONT_OPTIONS} /></Field>
                <Field label="Subtitle font"><SelectInput value={posterSubtitleFontType} onChange={setPosterSubtitleFontType} options={FONT_OPTIONS} /></Field>
                <Field label="Second font"><SelectInput value={posterSecondSubtitleFontType} onChange={setPosterSecondSubtitleFontType} options={FONT_OPTIONS} /></Field>
                <Field label="Outline colour"><ColourInput value={posterOutlineColour} onChange={setPosterOutlineColour} /></Field>
                <Field label="Outline weight"><RangeInput value={posterOutlineWeight} onChange={setPosterOutlineWeight} min={0} max={4} step={0.25} suffix="px" /></Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <CheckboxControl checked={posterShowLogo} onChange={setPosterShowLogo} label="Include logo" />
                <CheckboxControl checked={posterLogoGlow} onChange={setPosterLogoGlow} label="Logo glow" />
                <CheckboxControl checked={posterLogoShadow} onChange={setPosterLogoShadow} label="Logo shadow" />
                <CheckboxControl checked={posterShowBrothers} onChange={setPosterShowBrothers} label="Brothers logo" />
              </div>
              <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 sm:grid-cols-2">
                <Field label="Glow colour"><ColourInput value={posterGlowColour} onChange={setPosterGlowColour} /></Field>
                <Field label="Glow transparency"><RangeInput value={posterGlowOpacity} onChange={setPosterGlowOpacity} min={0} max={1} step={0.05} suffix="" /></Field>
                <Field label="Glow brightness"><RangeInput value={posterGlowBrightness} onChange={setPosterGlowBrightness} min={0.5} max={2} step={0.05} suffix="×" /></Field>
                <Field label="Shadow opacity"><RangeInput value={posterShadowOpacity} onChange={setPosterShadowOpacity} min={0} max={1} step={0.05} suffix="" /></Field>
              </div>
              <div className="grid gap-3 rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3 sm:grid-cols-2">
                <Field label="Logo scale"><RangeInput value={posterLogoScale} onChange={setPosterLogoScale} min={0.65} max={1.45} step={0.05} /></Field>
                <Field label="Title scale"><RangeInput value={posterTitleScale} onChange={setPosterTitleScale} min={0.65} max={1.5} step={0.05} /></Field>
                <Field label="Subtitle scale"><RangeInput value={posterSubtitleScale} onChange={setPosterSubtitleScale} min={0.65} max={1.6} step={0.05} /></Field>
                <Field label="Second scale"><RangeInput value={posterSecondSubtitleScale} onChange={setPosterSecondSubtitleScale} min={0.65} max={1.6} step={0.05} /></Field>
                <Field label="Brothers scale"><RangeInput value={posterBrothersScale} onChange={setPosterBrothersScale} min={0.65} max={1.45} step={0.05} /></Field>
              </div>
              <XYScaleControls title="Logo position" x={posterLogoX} setX={setPosterLogoX} y={posterLogoY} setY={setPosterLogoY} scale={posterLogoScale} setScale={setPosterLogoScale} xRange={90} yRange={70} minScale={0.65} maxScale={1.45} />
              <XYScaleControls title="Main text position" x={posterTitleX} setX={setPosterTitleX} y={posterTitleY} setY={setPosterTitleY} scale={posterTitleScale} setScale={setPosterTitleScale} xRange={90} yRange={70} minScale={0.65} maxScale={1.5} />
              <XYScaleControls title="Subtitle position" x={posterSubtitleX} setX={setPosterSubtitleX} y={posterSubtitleY} setY={setPosterSubtitleY} scale={posterSubtitleScale} setScale={setPosterSubtitleScale} xRange={90} yRange={70} minScale={0.65} maxScale={1.6} />
              <XYScaleControls title="Second subtitle position" x={posterSecondSubtitleX} setX={setPosterSecondSubtitleX} y={posterSecondSubtitleY} setY={setPosterSecondSubtitleY} scale={posterSecondSubtitleScale} setScale={setPosterSecondSubtitleScale} xRange={90} yRange={70} minScale={0.65} maxScale={1.6} />
              <XYScaleControls title="Brothers position" x={posterBrothersX} setX={setPosterBrothersX} y={posterBrothersY} setY={setPosterBrothersY} scale={posterBrothersScale} setScale={setPosterBrothersScale} xRange={90} yRange={50} minScale={0.65} maxScale={1.45} />
            </div>
          )}

          {activeState.id === "shirt" && (
            <div className="grid gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Team"><TeamSelect value={shirtTeam} onChange={setShirtTeam} /></Field>
                <Field label="Name"><TextInput value={shirtName} onChange={(value) => setShirtName(value.toUpperCase())} /></Field>
                <Field label="Number"><TextInput type="number" min="0" max="99" value={shirtNumber} onChange={(value) => setShirtNumber(String(value).slice(0, 2))} /></Field>
                <Field label="Background"><SelectInput value={shirtBgMode} onChange={setShirtBgMode} options={[{ value: "team", label: "TEAM" }, { value: "custom", label: "CUSTOM" }]} /></Field>
                <Field label="Custom bg"><ColourInput value={shirtCustomBg} onChange={setShirtCustomBg} /></Field>
                <Field label="Text colour"><ColourInput value={shirtTextColour} onChange={setShirtTextColour} /></Field>
                <Field label="Number colour"><ColourInput value={shirtNumberColour} onChange={setShirtNumberColour} /></Field>
                <Field label="Outline colour"><ColourInput value={shirtOutlineColour} onChange={setShirtOutlineColour} /></Field>
                <Field label="Font"><SelectInput value={shirtFontType} onChange={setShirtFontType} options={FONT_OPTIONS} /></Field>
                <Field label="Font weight"><SelectInput value={shirtFontWeight} onChange={setShirtFontWeight} options={FONT_WEIGHT_OPTIONS} /></Field>
                <Field label="Font style"><SelectInput value={shirtFontStyle} onChange={setShirtFontStyle} options={FONT_STYLE_OPTIONS} /></Field>
                <Field label="Outline weight"><RangeInput value={shirtOutlineWeight} onChange={setShirtOutlineWeight} min={0} max={6} step={0.25} suffix="px" /></Field>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <CheckboxControl checked={shirtShowMondayLogo} onChange={setShirtShowMondayLogo} label="Monday logo" />
                <CheckboxControl checked={shirtShowBrothers} onChange={setShirtShowBrothers} label="Brothers logo" />
                <CheckboxControl checked={shirtShowName} onChange={setShirtShowName} label="Shirt name" />
                <CheckboxControl checked={shirtShowNumber} onChange={setShirtShowNumber} label="Shirt number" />
                <CheckboxControl checked={shirtNameNumberLocked} onChange={setShirtNameNumberLocked} label="Lock name + number scale" />
                <CheckboxControl checked={shirtOutlineEnabled} onChange={setShirtOutlineEnabled} label="Outline text" />
              </div>
              {shirtNameNumberLocked && (
                <div className="rounded-[14px] border border-[#F5F1E8]/10 bg-[#051A11]/48 p-3">
                  <Field label="Name + number scale"><RangeInput value={shirtNameScale} onChange={setShirtNameNumberScale} min={0.7} max={1.35} step={0.05} /></Field>
                </div>
              )}
              <XYScaleControls title="Monday logo position" x={shirtMondayX} setX={setShirtMondayX} y={shirtMondayY} setY={setShirtMondayY} scale={shirtMondayScale} setScale={setShirtMondayScale} xRange={90} yRange={70} minScale={0.65} maxScale={1.35} />
              <XYScaleControls title="Name position" x={shirtNameX} setX={setShirtNameX} y={shirtNameY} setY={setShirtNameY} scale={shirtNameScale} setScale={shirtNameNumberLocked ? null : setLockedShirtNameScale} xRange={100} yRange={90} minScale={0.7} maxScale={1.35} />
              <XYScaleControls title="Number position" x={shirtNumberX} setX={setShirtNumberX} y={shirtNumberY} setY={setShirtNumberY} scale={shirtNumberScale} setScale={shirtNameNumberLocked ? null : setLockedShirtNumberScale} xRange={100} yRange={90} minScale={0.7} maxScale={1.35} />
              <XYScaleControls title="Brothers position" x={shirtBrothersX} setX={setShirtBrothersX} y={shirtBrothersY} setY={setShirtBrothersY} scale={shirtBrothersScale} setScale={setShirtBrothersScale} xRange={90} yRange={60} minScale={0.65} maxScale={1.35} />
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default ShareScreen;
