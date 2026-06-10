import { MatchPitchPreview } from "../match/FootballGame.jsx";
import { teamToGameTeam } from "../../logic/matchPresentation.js";
import { GAME, getDirection, keeperTransform } from "../../logic/penaltyEngine.js";
import { ASSETS } from "../../data/assets.js";
import { getTeamTheme } from "../../data/teams.js";
import {
  DARK_GREEN,
  IVORY,
  LED_YELLOW,
  PITCH_MOW_BACKGROUND_STYLE,
} from "./shareConstants.js";
import {
  TeamFlag,
  MarkerDots,
  clampNumber,
  editorTransform,
  textStroke,
  mergeTransforms,
  flashTickerFontSize,
  backgroundFor,
  hexWithAlpha,
  fontFamilyFor,
  padArray,
} from "./shareUtils.jsx";

const EXPORT_PITCH_CROP_RATIO = 100 / 38;

function ExportCroppedPitch({ userTeam, opponentTeam, crowdStage, badgeMode, matchDesign = {}, showGoalkeeper, goalkeeperPosition, showBall, ballPosition }) {
  return (
    <div className="absolute inset-0 z-[1] overflow-hidden bg-[#0d6c3d]">
      <div
        className="absolute inset-x-0 top-0"
        style={{ height: `${EXPORT_PITCH_CROP_RATIO * 100}%` }}
      >
        <MatchPitchPreview
          userTeam={userTeam}
          opponentTeam={opponentTeam}
          stageLabel={crowdStage}
          showActors={false}
          pitchMowVariant="export"
          showAdBoard={true}
          showPitchMarkings={false}
        />
      </div>
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
    textShadow: "0 0 0.35px rgba(247,209,23,0.10)",
  };
  const scoreTextStyle = {
    ...boardTextStyle,
    fontSize: `clamp(17px, ${6.15 * Number(d.scoreScale || 1)}cqw, ${34 * Number(d.scoreScale || 1)}px)`,
    fontWeight: 900,
    transform: editorTransform({ x: d.scoreX, y: d.scoreY, scale: d.scoreScale }),
  };
  const codeTextStyle = (side) => ({
    ...boardTextStyle,
    fontSize: `clamp(17px, ${6.15 * Number(d.teamScale || 1)}cqw, ${34 * Number(d.teamScale || 1)}px)`,
    fontWeight: 900,
    letterSpacing: "0em",
    transform: editorTransform({ x: side === "A" ? d.teamAX : d.teamBX, y: side === "A" ? d.teamAY : d.teamBY, scale: d.teamScale }),
  });
  const markerShell = "inline-flex max-w-full items-center justify-center px-1 py-0";
  const flashCopy = String(flashText || "SHARE YOUR RESULT").replace(/\s+/g, " ").trim();
  const flashFontSize = "16px";

  return (
    <section
      data-share-scoreboard="true"
      className="relative shrink-0 overflow-hidden bg-[#050505]"
      style={{ height: boardHeight, containerType: "inline-size" }}
    >
      <div data-share-scoreboard-main="true" className="relative h-[76%] overflow-hidden border-y border-[#F5F1E8]/18 bg-[#050505] shadow-[0_2px_8px_rgba(0,0,0,0.20)]">
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

        <div className="relative z-[1] flex h-full items-center px-0 py-0">
          <div
            className="grid h-[88%] w-full items-center justify-items-center"
            style={{
              gridTemplateColumns: "10% minmax(0,27%) 10.5% 5% 10.5% minmax(0,27%) 10%",
              gridTemplateRows: "30% 45% 25%",
            }}
          >
            {d.showStage && (
              <div data-normalise-stage-label="true" className="col-start-2 col-end-7 row-start-1 flex items-center justify-center">
                <div className={`${d.stageBox ? "rounded-[6px] border border-[#F5F1E8]/22 bg-[#050505] px-3 py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]" : "px-1 py-0"} inline-flex min-h-[20px] max-w-full items-center justify-center`} style={{ transform: editorTransform({ x: d.stageX, y: d.stageY, scale: d.stageScale }) }}>
                  <div className="led-text-glow font-led flex h-full items-center justify-center whitespace-nowrap text-center text-[10px] font-black uppercase leading-none tracking-[0.11em]" style={{ ...boardTextStyle, fontWeight: 900 }}>
                    {stageTitle || "FINAL"}
                  </div>
                </div>
              </div>
            )}

            <div className="col-start-1 row-start-2 flex h-full w-full items-center justify-center overflow-visible">
              {d.showFlags && <TeamFlag team={userTeam} className="h-[17px] w-[25px] border border-[#F7D117]/88 bg-[#F5F1E8] shadow-none drop-shadow-none" style={{ transform: editorTransform({ x: Number(d.flagAX || 0) + 7, y: d.flagAY, scale: d.flagScale }) }} />}
            </div>
            <div className="col-start-2 row-start-2 row-end-4 grid h-full min-w-0 overflow-visible px-0" style={{ gridTemplateRows: "45fr 25fr" }}>
              <div className="row-start-1 flex h-full min-w-0 items-center justify-center overflow-visible">
                {d.showTeamCodes && <div data-share-team-code="A" className="led-text-glow font-led flex h-full w-full items-center justify-center overflow-visible whitespace-nowrap text-center font-black leading-none" style={codeTextStyle("A")}>{userTeam.code}</div>}
              </div>
              {showMarkers && (
                <div className="relative z-[1] row-start-2 flex h-full min-w-0 items-center justify-center overflow-hidden">
                  <div className={markerShell} style={{ transform: editorTransform({ x: d.markerAX, y: d.markerAY, scale: d.markerScale }) }}>
                    <span className="flex min-h-[16px] items-center justify-center leading-none"><MarkerDots markers={teamAMarkers} totalSlots={totalMarkerSlots} /></span>
                  </div>
                </div>
              )}
            </div>
            {d.showScore && d.scoreDisplayMode === "vs" ? (
              <div className="col-start-3 col-end-6 row-start-2 flex h-full items-center justify-center">
                <div data-share-score-text="true" className="led-text-glow font-led" style={scoreTextStyle}>VS</div>
              </div>
            ) : (
              <>
                <div className="col-start-3 row-start-2 flex h-full items-center justify-center">
                  {d.showScore && <div data-share-score-text="true" className="led-text-glow font-led tabular-nums" style={scoreTextStyle}>{score.user}</div>}
                </div>
                <div className="col-start-4 row-start-2 flex h-full items-center justify-center">
                  {d.showScore && <div data-share-score-text="true" className="led-text-glow font-led" style={scoreTextStyle}>-</div>}
                </div>
                <div className="col-start-5 row-start-2 flex h-full items-center justify-center">
                  {d.showScore && <div data-share-score-text="true" className="led-text-glow font-led tabular-nums" style={scoreTextStyle}>{score.opponent}</div>}
                </div>
              </>
            )}
            <div className="col-start-6 row-start-2 row-end-4 grid h-full min-w-0 overflow-visible px-0" style={{ gridTemplateRows: "45fr 25fr" }}>
              <div className="row-start-1 flex h-full min-w-0 items-center justify-center overflow-visible">
                {d.showTeamCodes && <div data-share-team-code="B" className="led-text-glow font-led flex h-full w-full items-center justify-center overflow-visible whitespace-nowrap text-center font-black leading-none" style={codeTextStyle("B")}>{opponentTeam.code}</div>}
              </div>
              {showMarkers && (
                <div className="relative z-[1] row-start-2 flex h-full min-w-0 items-center justify-center overflow-hidden">
                  <div className={markerShell} style={{ transform: editorTransform({ x: d.markerBX, y: d.markerBY, scale: d.markerScale }) }}>
                    <span className="flex min-h-[16px] items-center justify-center leading-none"><MarkerDots markers={teamBMarkers} totalSlots={totalMarkerSlots} /></span>
                  </div>
                </div>
              )}
            </div>
            <div className="col-start-7 row-start-2 flex h-full w-full items-center justify-center overflow-visible">
              {d.showFlags && <TeamFlag team={opponentTeam} className="h-[17px] w-[25px] border border-[#F7D117]/88 bg-[#F5F1E8] shadow-none drop-shadow-none" style={{ transform: editorTransform({ x: Number(d.flagBX || 0) - 7, y: d.flagBY, scale: d.flagScale }) }} />}
            </div>

            {showMarkers ? (
              <div data-share-username-slot="true" className="relative z-[3] col-start-3 col-end-6 row-start-3 flex h-full items-center justify-center px-1">
                <div className={`${usernameEnabled ? "visible" : "invisible"} led-text-glow font-led inline-flex min-h-[20px] max-w-full items-center justify-center truncate whitespace-nowrap rounded-[6px] border border-[#F5F1E8]/22 bg-[#050505] px-3 text-center text-[9px] font-black uppercase leading-none tracking-[0.11em] shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]`} style={{ ...boardTextStyle, transform: editorTransform({ x: d.usernameX, y: d.usernameY, scale: d.usernameScale }) }}>
                  {(String(username || "").replace(/\s+/g, " ").trim().toUpperCase()) || "GUEST"}
                </div>
              </div>
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

      <div
        data-share-flash="true"
        className="relative flex h-[24%] w-full items-center justify-center overflow-hidden px-[3%] text-center"
        style={{
          ...flashStyle,
          background: d.flashBox ? flashStyle.background : "transparent",
          boxShadow: d.flashBox ? "0 0 8px rgba(245,241,232,0.05), inset 0 2px 8px rgba(255,255,255,0.08)" : "none",
          lineHeight: 1,
        }}
      >
        <span
          data-share-flash-text="true"
          className="home-copy-bold flex h-full w-[94%] items-center justify-center overflow-hidden truncate whitespace-nowrap text-center font-black uppercase leading-none tracking-[0.085em] [text-wrap:nowrap]"
          style={{
            fontFamily: fontFamilyFor(d.flashFontType),
            fontSize: flashFontSize,
            lineHeight: 1,
            textOverflow: "ellipsis",
            WebkitTextStroke: textStroke(d.flashOutlineWeight, d.flashOutlineColour),
            transform: editorTransform({ x: d.flashX, y: d.flashY, scale: d.flashScale }),
          }}
        >
          {flashCopy}
        </span>
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
    monday: {
      src: ASSETS.branding.mondayLogo,
      alt: "Monday Cup",
      width: "99.825%",
      height: "74.415%",
      glow: null,
      shadow: "drop-shadow(0 10px 24px rgba(0,0,0,0.44))",
    },
    champion: { src: ASSETS.badges.champion, alt: "Champion", width: "89.8425%", height: "66.9735%", glow: LED_YELLOW, glowOuter: "2E", glowInner: "20", shadow: "drop-shadow(0 18px 24px rgba(0,0,0,0.30))" },
    runnerUp: { src: ASSETS.badges.runnerUp, alt: "Runner-up", width: "89.8425%", height: "66.9735%", glow: IVORY, glowOuter: "29", glowInner: "1C", shadow: "drop-shadow(0 18px 24px rgba(0,0,0,0.30))" },
    third: { src: ASSETS.badges.third, alt: "Third place", width: "89.8425%", height: "66.9735%", glow: "#C8863A", glowOuter: "2E", glowInner: "20", shadow: "drop-shadow(0 18px 24px rgba(0,0,0,0.30))" },
  };
  const badge = badgeMap[mode] || badgeMap.monday;
  const hasGlow = Boolean(badge.glow);
  return (
    <div
      className="pointer-events-none absolute left-1/2 z-[30] flex items-center justify-center"
      style={{ top: "39%", width: badge.width, height: badge.height, transform: mergeTransforms("translate(-50%, -50%)", editorTransform({ x, y, scale })) }}
      aria-hidden="true"
    >
      {mode === "monday" && <div className="absolute inset-x-[10%] bottom-[2%] h-[42%] rounded-full bg-[#F7D117]/28 blur-3xl" />}
      {mode === "monday" && <div className="absolute inset-x-[14%] bottom-[3%] h-[36%] rounded-full bg-[#F5F1E8]/24 blur-2xl" />}
      {hasGlow && <div className="absolute left-1/2 top-[54%] h-[56%] w-[76%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl" style={{ background: `${badge.glow}${badge.glowOuter || "2E"}` }} />}
      {hasGlow && <div className="absolute left-1/2 top-[54%] h-[38%] w-[54%] -translate-x-1/2 -translate-y-1/2 rounded-full blur-2xl" style={{ background: `${badge.glow}${badge.glowInner || "20"}` }} />}
      <img src={badge.src} alt={badge.alt} className="relative z-[1] h-full w-full object-contain" style={{ filter: badge.shadow || "drop-shadow(0 16px 22px rgba(0,0,0,0.26))" }} draggable={false} crossOrigin="anonymous" />
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

export function ShareMatchPreview({
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
        <ExportCroppedPitch
          userTeam={userTeam}
          opponentTeam={opponentTeam}
          crowdStage={crowdStage}
          badgeMode={badgeMode}
          matchDesign={matchDesign}
          showGoalkeeper={showGoalkeeper}
          goalkeeperPosition={goalkeeperPosition}
          showBall={showBall}
          ballPosition={ballPosition}
        />
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

export function BracketPreview({ bracketTitle, bracketTeams, champion }) {
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

export function PosterPreview({
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

function getShirtFabricTheme(team, fallbackBackground, fallbackText, fallbackNumber, patternOptions = {}) {
  const base = team ? getTeamTheme(team) : null;
  const result = {
    background: base?.primary || base?.bg || fallbackBackground || "#073B26",
    textColour: base?.secondary || base?.text || fallbackText || IVORY,
    numberColour: base?.secondary || base?.text || fallbackNumber || fallbackText || IVORY,
    numberOutlineEnabled: false,
    numberOutlineColour: "transparent",
    numberOutlineWidth: 0,
    pattern: null,
    patternColour: patternOptions.patternColour || "#FFFFFF",
    brothersAsset: ASSETS.branding.myMundialLogo,
  };

  switch (team) {
    case "Argentina":
      result.background = base?.primary || "#75AADB";
      result.textColour = base?.tertiary || "#1F2A44";
      result.numberColour = base?.tertiary || "#1F2A44";
      result.pattern = "argentina-stripes";
      break;
    case "Brazil":
      result.background = base?.primary || "#F7D117";
      result.textColour = base?.secondary || "#009C3B";
      result.numberColour = base?.secondary || "#009C3B";
      break;
    case "Croatia":
      result.background = base?.primary || "#FFFFFF";
      result.textColour = base?.tertiary || "#23408E";
      result.numberColour = base?.tertiary || "#23408E";
      result.pattern = "croatia-checker";
      break;
    case "United States":
      result.background = base?.primary || "#FFFFFF";
      result.textColour = base?.secondary || "#1F2A44";
      result.numberColour = base?.secondary || "#1F2A44";
      break;
    case "England":
      result.background = base?.primary || "#FFFFFF";
      result.textColour = base?.secondary || "#C8102E";
      result.numberColour = base?.secondary || "#C8102E";
      result.numberOutlineEnabled = true;
      result.numberOutlineColour = base?.tertiary || "#1F2A44";
      result.numberOutlineWidth = 9;
      break;
    case "Portugal":
      result.background = base?.primary || "#B30B18";
      result.textColour = base?.tertiary || "#FFFFFF";
      result.numberColour = base?.tertiary || "#FFFFFF";
      result.numberOutlineEnabled = true;
      result.numberOutlineColour = base?.secondary || "#006A4E";
      result.numberOutlineWidth = 11;
      break;
    default:
      break;
  }

  // Editor inputs are the source of truth. Team presets provide the starting kit,
  // but colour controls must always update the live preview immediately.
  result.background = fallbackBackground || result.background;
  result.textColour = fallbackText || result.textColour;
  result.numberColour = fallbackNumber || fallbackText || result.numberColour;
  const manualPattern = patternOptions.patternMode || "team";
  if (manualPattern === "plain") {
    result.pattern = null;
  } else if (manualPattern && manualPattern !== "team") {
    result.pattern = manualPattern;
  }
  result.patternColour = patternOptions.patternColour || result.patternColour || "#FFFFFF";

  const whiteBackground = ["#FFFFFF", "#F5F1E8"].includes(String(result.background || "").toUpperCase());
  result.brothersAsset = whiteBackground ? ASSETS.branding.brothersDark : ASSETS.branding.myMundialLogo;
  return result;
}

function ShirtFabricPattern({ pattern, colour = "#FFFFFF" }) {
  if (!pattern) return null;
  const safeColour = colour || "#FFFFFF";
  if (pattern === "argentina-stripes") {
    return <div className="absolute inset-0 opacity-[0.98]" style={{ backgroundImage: "linear-gradient(90deg, #75AADB 0 20%, #FFFFFF 20% 40%, #75AADB 40% 60%, #FFFFFF 60% 80%, #75AADB 80% 100%)" }} />;
  }
  if (pattern === "croatia-checker") {
    return (
      <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 overflow-hidden">
        {Array.from({ length: 25 }).map((_, index) => {
          const row = Math.floor(index / 5);
          const col = index % 5;
          const active = (row + col) % 2 === 1;
          return <div key={`croatia-square-${index}`} style={{ backgroundColor: active ? "#C7222A" : "#FFFFFF" }} />;
        })}
      </div>
    );
  }
  if (pattern === "stripes") {
    return <div className="absolute inset-0 opacity-[0.94]" style={{ backgroundImage: `linear-gradient(90deg, transparent 0 20%, ${safeColour} 20% 40%, transparent 40% 60%, ${safeColour} 60% 80%, transparent 80% 100%)` }} />;
  }
  if (pattern === "hoops") {
    return <div className="absolute inset-0 opacity-[0.94]" style={{ backgroundImage: `linear-gradient(180deg, transparent 0 20%, ${safeColour} 20% 40%, transparent 40% 60%, ${safeColour} 60% 80%, transparent 80% 100%)` }} />;
  }
  if (pattern === "checkerboard") {
    return (
      <div className="absolute inset-0 grid grid-cols-5 grid-rows-5 overflow-hidden opacity-[0.94]">
        {Array.from({ length: 25 }).map((_, index) => {
          const row = Math.floor(index / 5);
          const col = index % 5;
          const active = (row + col) % 2 === 1;
          return <div key={`shirt-checker-${index}`} style={{ backgroundColor: active ? safeColour : "transparent" }} />;
        })}
      </div>
    );
  }
  return null;
}

export function ShirtPosterPreview({
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
  shirtNumberOutlineEnabled = false,
  shirtOutlineColour,
  shirtPatternMode = "team",
  shirtPatternColour = "#FFFFFF",
  shirtFontWeight,
  shirtFontStyle,
  shirtFontType = "bold",
  shirtShowName = true,
  shirtShowNumber = true,
  shirtOutlineWeight = 2,
  shirtNumberOutlineWeight = null,
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
  const rawBackground = shirtBgMode === "custom" ? shirtCustomBg : kit.primaryColour;
  const fabricTheme = getShirtFabricTheme(shirtTeam, rawBackground, shirtTextColour, shirtNumberColour, {
    patternMode: shirtPatternMode,
    patternColour: shirtPatternColour,
  });
  const background = fabricTheme.background;
  const nameLength = String(shirtName || "").length;
  const nameBase = nameLength > 12 ? 31 : nameLength > 9 ? 39 : 50;
  // Shirt-print name and number scale are deliberately locked for consistent promo exports.
  const LOCKED_SHIRT_NAME_SCALE = 1.18;
  const LOCKED_SHIRT_NUMBER_SCALE = 1.58;
  const nameScaleValue = LOCKED_SHIRT_NAME_SCALE;
  const numberScaleValue = LOCKED_SHIRT_NUMBER_SCALE;
  const nameSize = Math.max(28, Math.min(72, nameBase * nameScaleValue));
  const numberSize = Math.max(280, Math.min(760, 430 * numberScaleValue));
  const mondayHeight = Math.max(24, Math.min(64, 38 * Number(shirtMondayScale || 1)));
  const brothersWidth = Math.max(8, Math.min(26, 14 * Number(shirtBrothersScale || 0.65)));
  const nameStrokeWidth = clampNumber(shirtOutlineWeight, 0, 16, 0);
  const numberManualStrokeWidth = clampNumber(shirtNumberOutlineWeight ?? shirtOutlineWeight, 0, 16, 0);
  const numberSvgStrokeWidth = numberManualStrokeWidth * 10;
  const stroke = shirtOutlineEnabled ? textStroke(nameStrokeWidth, shirtOutlineColour) : "0 transparent";
  const numberStrokeEnabled = fabricTheme.numberOutlineEnabled || shirtNumberOutlineEnabled;
  const numberStrokeColour = fabricTheme.numberOutlineEnabled ? fabricTheme.numberOutlineColour : shirtOutlineColour;
  const numberStrokeWidth = fabricTheme.numberOutlineEnabled ? fabricTheme.numberOutlineWidth : (shirtNumberOutlineEnabled ? numberSvgStrokeWidth : 0);
  const shirtFontFamily = fontFamilyFor(shirtFontType);
  const numberText = String(shirtNumber || "99").slice(0, 2);
  const doubleNumberSpacing = numberText.length > 1 ? "-0.032em" : "0em";
  const singleDigitOpticalX = numberText === "4" ? -10 : 0;
  const centred = (x, y, scale = 1) => mergeTransforms("translate(-50%, -50%)", editorTransform({ x, y, scale }));
  return (
    <div className="relative h-full w-full overflow-hidden text-center text-[#F5F1E8]" style={{ background }}>
      <ShirtFabricPattern pattern={fabricTheme.pattern} colour={fabricTheme.patternColour} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(255,255,255,0.14),transparent_31%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(0,0,0,0.065))]" />
      {shirtShowMondayLogo && (
        <div className="absolute left-1/2 top-[10%] z-[2] grid place-items-center" style={{ height: mondayHeight, width: mondayHeight * 1.05, transform: centred(shirtMondayX, shirtMondayY) }}>
          <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="h-full w-full object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.20)]" style={{ imageRendering: "auto" }} draggable={false} />
        </div>
      )}
      {shirtShowName && (
        <div className="home-copy-bold absolute left-1/2 top-[30%] z-[2] w-[88%] truncate uppercase leading-none tracking-[0.06em]" style={{ color: fabricTheme.textColour, fontFamily: shirtFontFamily, fontSize: nameSize, fontWeight: shirtFontWeight, fontStyle: shirtFontStyle, WebkitTextStroke: stroke, textAlign: "center", textShadow: "0 2px 0 rgba(0,0,0,0.12)", transform: centred(shirtNameX, shirtNameY) }}>
          {shirtName || "GUEST"}
        </div>
      )}
      {shirtShowNumber && (
        <svg className="absolute left-1/2 top-[60%] z-[2] w-[94%] overflow-visible" viewBox="0 0 1000 520" preserveAspectRatio="xMidYMid meet" style={{ height: numberSize * 0.78, transform: centred(Number(shirtNumberX || 0) + singleDigitOpticalX, shirtNumberY) }} aria-label={numberText}>
          <text
            x="500"
            y="273"
            textAnchor="middle"
            dominantBaseline="middle"
            lengthAdjust="spacing"
            style={{
              fill: "rgba(0,0,0,0.12)",
              fontFamily: shirtFontFamily,
              fontSize: numberSize,
              fontWeight: 900,
              fontStyle: shirtFontStyle,
              letterSpacing: doubleNumberSpacing,
              stroke: "none",
            }}
          >
            {numberText}
          </text>
          <text
            x="500"
            y="266"
            textAnchor="middle"
            dominantBaseline="middle"
            lengthAdjust="spacing"
            style={{
              fill: fabricTheme.numberColour,
              fontFamily: shirtFontFamily,
              fontSize: numberSize,
              fontWeight: 900,
              fontStyle: shirtFontStyle,
              letterSpacing: doubleNumberSpacing,
              stroke: numberStrokeEnabled ? numberStrokeColour : "none",
              strokeWidth: numberStrokeWidth,
              paintOrder: "stroke fill",
            }}
          >
            {numberText}
          </text>
        </svg>
      )}
      {shirtShowBrothers && (
        <img src={fabricTheme.brothersAsset || ASSETS.branding.myMundialLogo} alt="Brothers" className="absolute left-1/2 top-[90%] z-[2] object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.18)]" style={{ width: `${brothersWidth}%`, transform: centred(shirtBrothersX, shirtBrothersY), imageRendering: "auto" }} draggable={false} />
      )}
    </div>
  );
}

export function PitchMow() {
  return <div data-share-force-pitch="true" className="pointer-events-none absolute inset-0" style={PITCH_MOW_BACKGROUND_STYLE} />;
}
