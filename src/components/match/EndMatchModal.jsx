import { useEffect, useMemo, useRef, useState } from "react";
import { ASSETS } from "../../data/assets.js";
import { Flag } from "../shared.jsx";
import { PODIUM_BADGE_MODE, RESULT_STATUS, normalizeResultStatus } from "../../logic/resultStatus.js";
import { ShareMatchPreview } from "../share/ShareScreen.jsx";
import {
  modalButton,
  modalHeaderTitle,
  teamToGameTeam,
} from "../../logic/matchPresentation.js";
import {
  getPodiumBadgeMode,
  isTerminalShareResult,
} from "../../logic/podium.js";
import {
  captureShareElementBlob,
  normaliseThirdPlaceCopy,
  shareOrDownloadResult,
} from "../../utils/shareExport.js";
import { TEAM_RANK } from "../../data/teams.js";

function CloseIcon({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
      <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
    </svg>
  );
}

function BackArrowIcon({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M15.5 4.75L8.25 12l7.25 7.25" stroke="currentColor" strokeWidth="2.85" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function ShareIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M8.8 12.2l6.4-3.7" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <path d="M8.8 12.2l6.4 3.7" stroke="currentColor" strokeWidth="2.35" strokeLinecap="round" />
      <circle cx="6.4" cy="12" r="2.45" stroke="currentColor" strokeWidth="2.35" />
      <circle cx="17.6" cy="5.9" r="2.45" stroke="currentColor" strokeWidth="2.35" />
      <circle cx="17.6" cy="18.1" r="2.45" stroke="currentColor" strokeWidth="2.35" />
    </svg>
  );
}

function MenuIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M5 7h14M5 12h14M5 17h14" stroke="currentColor" strokeWidth="2.75" strokeLinecap="round" />
    </svg>
  );
}

function TrophyIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <path d="M8 4h8v3.5c0 2.7-1.55 4.7-4 5.35-2.45-.65-4-2.65-4-5.35V4Z" stroke="currentColor" strokeWidth="2.35" strokeLinejoin="round" />
      <path d="M8.15 6H5.5v1.2c0 2.05 1.15 3.55 3.25 4.05M15.85 6h2.65v1.2c0 2.05-1.15 3.55-3.25 4.05" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 13v3.2M8.8 20h6.4M10 16.2h4v2.2h-4z" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}



function getCampaignPointsTotal({ result, groupRows = [], userTeam = null, userForm = [] }) {
  const directValue = result?.campaignPoints ?? result?.pointsTotal ?? result?.leaderboardPoints ?? result?.totalPoints;
  if (Number.isFinite(Number(directValue))) return Number(directValue);

  const userRow = groupRows.find((row) => row.team === userTeam);
  const tablePoints = Number(userRow?.pts || 0);
  const formBonus = userForm.reduce((total, item) => {
    if (item === "W") return total + 3;
    if (item === "D") return total + 1;
    return total;
  }, 0);

  if (tablePoints || formBonus) return Math.max(tablePoints, formBonus);
  return 0;
}

function FormTracker({ form = [], className = "" }) {
  const ledClass = (value) => {
    if (value === "W") return "bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.85),0_0_22px_rgba(34,197,94,0.32)]";
    if (value === "L") return "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.85),0_0_22px_rgba(239,68,68,0.32)]";
    if (value === "D") return "bg-[#F7D117] shadow-[0_0_10px_rgba(247,209,23,0.9),0_0_22px_rgba(247,209,23,0.34)]";
    return "bg-[#F7D117]/28 shadow-[0_0_6px_rgba(247,209,23,0.25)]";
  };

  return (
    <div className={`flex min-w-0 items-center justify-center gap-[clamp(2px,0.65vw,4px)] ${className}`}>
      {Array.from({ length: 8 }).map((_, index) => (
        <span key={index} className={`block shrink-0 rounded-full ${ledClass(form[index])}`} style={{ height: "var(--result-rail-size)", width: "var(--result-rail-size)" }} />
      ))}
    </div>
  );
}

function ResultStatusRail({ form = [], points = 0 }) {
  return (
    <div
      className="mx-auto mb-[12px] flex h-[44px] w-[90%] min-w-0 items-center justify-center gap-[clamp(10px,3vw,16px)] overflow-hidden rounded-[0.48rem] border border-[#F5F1E8]/22 bg-[#050505]/62 px-[clamp(12px,3.2vw,18px)] py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]"
      style={{ "--result-rail-size": "clamp(12px,3.4vw,18px)" }}
    >
      <FormTracker form={form} />
      <span className="block h-[58%] w-px shrink-0 bg-[#F5F1E8]/18" aria-hidden="true" />
      <span className="relative z-[1] inline-flex min-w-[42px] items-center justify-center font-led leading-none text-[#F7D117] led-text-glow tabular-nums" style={{ fontSize: "var(--result-rail-size)" }}>{Number(points || 0)}</span>
    </div>
  );
}

function markerForShareAttempt(attempt) {
  if (typeof attempt === "string") {
    const value = attempt.toUpperCase();
    if (value === "G" || value === "GOAL") return "G";
    if (value === "S" || value === "SAVE" || value === "SAVED" || value === "MISS" || value === "MISSED") return "S";
  }
  if (attempt?.goal === true || attempt?.result === "goal" || attempt?.shotResult === "goal") return "G";
  if (attempt?.goal === false || attempt?.result === "save" || attempt?.shotResult === "save" || attempt?.shotResult === "miss" || attempt?.result === "miss") return "S";
  return "";
}

function fallbackShareAttempts(goals = 0, slots = 5) {
  return Array.from({ length: slots }).map((_, index) => (index < Number(goals || 0) ? "G" : "S"));
}

function shareAttemptSequence(source = [], goals = 0) {
  const mapped = Array.isArray(source) ? source.map(markerForShareAttempt).filter(Boolean) : [];
  return mapped.length ? mapped : fallbackShareAttempts(goals);
}


function resultOutcomeCode(result) {
  if (result?.isDraw) return "D";
  if (result?.won || result?.userWon) return "W";
  return "L";
}

function teamRankBucket(teamName) {
  const rank = Number(TEAM_RANK[teamName] || 48);
  return rank <= 24 ? "top" : "lower";
}

function opponentRankIsHigher(userTeamName, opponentTeamName) {
  return Number(TEAM_RANK[opponentTeamName] || 48) < Number(TEAM_RANK[userTeamName] || 48);
}

function groupPositionForTeam(groupRows = [], teamName = "") {
  const index = groupRows.findIndex((row) => row.team === teamName);
  return index >= 0 ? index + 1 : null;
}

function isTeamQualified(qualifiedTeams, teamName) {
  if (!qualifiedTeams || !teamName) return false;
  if (qualifiedTeams instanceof Set) return qualifiedTeams.has(teamName);
  if (Array.isArray(qualifiedTeams)) return qualifiedTeams.includes(teamName);
  return Boolean(qualifiedTeams[teamName]);
}

function exportFlashCopy({ result, userTeamName, opponentTeamName, userForm = [], groupRows = [], qualifiedTeams = new Set() }) {
  const status = normalizeResultStatus(result?.status);
  const matchNo = Number(result?.matchNo || 0);
  const won = Boolean(result?.won || result?.userWon);
  const outcome = resultOutcomeCode(result);
  const week = Number(result?.week || 0);
  const formThroughMatch = Array.isArray(userForm) && userForm.length
    ? userForm.slice(0, Math.max(week || userForm.length, userForm.length))
    : [outcome];

  if (week === 1) {
    if (outcome === "W") return "YOU ARE OFF TO A FLYER!";
    if (outcome === "L") return "NOT THE BEST START...";
    return opponentRankIsHigher(userTeamName, opponentTeamName) ? "POINTS ON THE BOARD!" : "YOU SHOULD'VE DONE BETTER";
  }

  if (week === 2) {
    const first = formThroughMatch[0] || "";
    const second = formThroughMatch[1] || outcome;
    if (first === "W" && second === "W") return "YOU ARE ON A ROLL!";
    if (first === "W" && second === "L") return "TAKE THE HIGHS WITH THE LOWS";
    if (first === "L" && second === "L") return "MIRACLES CAN HAPPEN, YOU KNOW?";
    if (first === "L" && second === "W") return "THINGS ARE LOOKING UP!";
    if (second === "D") return opponentRankIsHigher(userTeamName, opponentTeamName) ? "A POINT IS A POINT" : "YOU NEED TO TAKE YOUR CHANCES";
    if (second === "W") return "THINGS ARE LOOKING UP!";
    return "TAKE THE HIGHS WITH THE LOWS";
  }

  if (week === 3 || status === RESULT_STATUS.QUALIFIED || status === RESULT_STATUS.ELIMINATED && result?.week) {
    const position = groupPositionForTeam(groupRows, userTeamName);
    const qualified = status === RESULT_STATUS.QUALIFIED || isTeamQualified(qualifiedTeams, userTeamName);
    const rankBucket = teamRankBucket(userTeamName);
    if (qualified) {
      if (position === 1) return "YOU MADE IT LOOK EASY";
      if (position === 2) return rankBucket === "top" ? "SOME EXTRA TRAINING SESSIONS, MAYBE?" : "NOT HERE TO MAKE UP THE NUMBERS";
      return "THROUGH BY THE SKIN OF YOUR TEETH";
    }
    return rankBucket === "top" ? "YOU'VE LET YOUR COUNTRY DOWN" : "YOU WERE NEVER GOING TO WIN IT ANYWAY...";
  }

  if (matchNo >= 73 && matchNo <= 88) return won ? "QUALIFIED FOR THE ROUND OF 16" : "ELIMINATED IN THE ROUND OF 32";
  if (matchNo >= 89 && matchNo <= 96) return won ? "QUALIFIED FOR THE QUARTER-FINALS" : "ELIMINATED IN THE ROUND OF 16";
  if (matchNo >= 97 && matchNo <= 100) return won ? "QUALIFIED FOR THE SEMI-FINALS" : "ELIMINATED IN THE QUARTER-FINALS";
  if (matchNo >= 101 && matchNo <= 102) return won ? "QUALIFIED FOR THE FINAL" : "ELIMINATED IN THE SEMI-FINALS";
  if (matchNo === 103) return won ? "CONGRATULATIONS, YOU'VE WON A WOODEN SPOON!" : "YOU'RE MORE SUNDAY LEAGUE THAN MONDAY CUP";
  if (matchNo === 104) return won ? "CHAMPIONES, CHAMPIONES, OLE OLE OLE!" : "WE SAW YOU CRYING ON THE TELE";

  if (status === RESULT_STATUS.KNOCKOUT_WIN) return "QUALIFIED FOR THE NEXT ROUND";
  if (status === RESULT_STATUS.ELIMINATED) return "ELIMINATED";
  if (outcome === "D") return "POINTS ON THE BOARD!";
  return won ? "YOU ARE OFF TO A FLYER!" : "NOT THE BEST START...";
}

function getResultShareState({ result, userTeam, stageLabel, userForm = [], groupRows = [], qualifiedTeams = new Set(), username = "" }) {
  const home = result?.home || userTeam || "Team A";
  const away = result?.away || "Team B";
  const userIsHome = userTeam ? home === userTeam : true;
  const userIsAway = userTeam ? away === userTeam : false;
  const teamAName = userIsAway ? away : home;
  const teamBName = userIsAway ? home : away;
  const teamAGoals = Number(userIsAway ? result?.awayGoals : result?.homeGoals) || 0;
  const teamBGoals = Number(userIsAway ? result?.homeGoals : result?.awayGoals) || 0;
  const teamA = teamToGameTeam(teamAName);
  const teamB = teamToGameTeam(teamBName);
  const attempts = result?.attempts || {};
  const teamAAttempts = userIsAway || userIsHome ? attempts.user : attempts.home;
  const teamBAttempts = userIsAway || userIsHome ? attempts.opponent : attempts.away;
  const teamAMarkers = shareAttemptSequence(teamAAttempts, teamAGoals);
  const teamBMarkers = shareAttemptSequence(teamBAttempts, teamBGoals);
  const totalMarkerSlots = Math.max(5, teamAMarkers.length, teamBMarkers.length);
  const stageTitle = result?.week ? "GROUP STAGE" : normaliseThirdPlaceCopy(stageLabel || "KNOCKOUT");
  const flashText = exportFlashCopy({ result, userTeamName: teamAName, opponentTeamName: teamBName, userForm, groupRows, qualifiedTeams });
  const cleanUsername = String(username || "").replace(/\s+/g, " ").trim().toUpperCase() || "GUEST";

  return {
    userTeam: teamA,
    opponentTeam: teamB,
    score: { user: teamAGoals, opponent: teamBGoals },
    stageTitle,
    flashText,
    flashStyle: { background: teamA.primaryColour, color: teamA.textColour },
    crowdStage: stageTitle,
    showMarkers: true,
    markerText: "PENALTIES",
    usernameEnabled: true,
    username: cleanUsername,
    teamAMarkers,
    teamBMarkers,
    totalMarkerSlots,
    badgeMode: "monday",
    showGoalkeeper: false,
    goalkeeperPosition: "CM",
    showBall: false,
    ballPosition: "spot",
    matchDesign: {
      scoreboardHeight: 34,
      textColour: "#F7D117",
      fontType: "led",
      showStage: true,
      stageBox: true,
      showFlags: true,
      showTeamCodes: true,
      showScore: true,
      scoreDisplayMode: "score",
      markerBox: false,
      markerScale: 1,
      flashBox: true,
      flashFontType: "bold",
      flashScale: 1,
      pitchHeight: 620,
      badgeScale: 1.01,
      badgeX: 0,
      badgeY: 0,
    },
  };
}


function StandingsMiniTable({ rows = [], qualifiedTeams = new Set(), userTeam = null }) {
  if (!rows.length) return null;

  const tableColumns = "20px 30px minmax(0, 1fr) 14px 18px 18px 18px 18px 20px 24px";
  const tightTeamStyle = (team) => (/bosnia/i.test(team || "") ? { letterSpacing: "-0.02em" } : undefined);

  return (
    <div className="mt-0 overflow-visible">
      <div className="grid gap-[3px] px-2 pb-[2px] text-center text-[9px] home-copy-regular uppercase tracking-[0.08em] text-[#F5F1E8]" style={{ gridTemplateColumns: tableColumns }}>
        <span>#</span><span className="text-center">TEAM</span><span aria-hidden="true" /><span aria-hidden="true" /><span>P</span><span>W</span><span>D</span><span>L</span><span>GD</span><span>Pts</span>
      </div>
      {rows.map((row, index) => {
        const isUser = row.team === userTeam;
        const isQualified = qualifiedTeams.has(row.team);
        return (
          <div key={row.team} className={`mb-1 grid items-center gap-[3px] rounded-xl border px-2 py-[5px] text-center text-[12px] leading-none last:mb-0 ring-1 ${isUser ? "border-[#F7D117]/70 bg-[#072D1D] text-[#F5F1E8] ring-[#F7D117]/32 shadow-[0_0_12px_rgba(247,209,23,0.10),0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)]" : "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18"}`} style={{ gridTemplateColumns: tableColumns }}>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{index + 1}</span>
            <span className="flex justify-center"><Flag team={row.team} className={`h-4 w-6 rounded-[4px] ring-1 ${isUser ? "ring-[#F7D117]/85" : "ring-[#F5F1E8]/35"}`} /></span>
            <span className={`min-w-0 truncate pl-2 text-left uppercase home-copy-regular ${isUser ? "text-[#F7D117]" : "text-[#26352E]"}`} style={tightTeamStyle(row.team)}>{row.team}</span>
            <span className={`flex h-full items-center justify-center text-[12px] home-copy-bold font-black leading-none ${isUser ? "text-[#F5F1E8]" : "text-[#0B5F35]"}`}>{isQualified ? "Q" : ""}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{row.played}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{row.won}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{row.drawn}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{row.lost}</span>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{row.gd}</span>
            <span className={`home-copy-bold ${isUser ? "text-[#F7D117]" : ""}`}>{row.pts}</span>
          </div>
        );
      })}
    </div>
  );
}

function ChampionConfetti({ count = 92 }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, index) => ({
    id: index,
    left: `${3 + Math.random() * 94}%`,
    delay: `${Math.random() * 0.7}s`,
    duration: `${3.1 + Math.random() * 1.35}s`,
    drift: `${(Math.random() - 0.5) * 150}px`,
    rotate: `${Math.random() * 720 - 360}deg`,
    width: `${5 + Math.random() * 5}px`,
    height: `${9 + Math.random() * 12}px`,
    start: `${-18 - Math.random() * 30}%`,
  })), [count]);

  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden="true">
      <style>{`
        @keyframes championConfettiFall {
          0% { opacity: 0; transform: translate3d(0, -18%, 0) rotate(0deg); }
          8% { opacity: 1; }
          78% { opacity: 0.95; }
          100% { opacity: 0; transform: translate3d(var(--drift), 124dvh, 0) rotate(var(--rotate)); }
        }
        @keyframes championConfettiShine {
          0%, 100% { filter: brightness(0.95) saturate(1.05); }
          45% { filter: brightness(1.65) saturate(1.35); }
        }
      `}</style>
      {pieces.map((piece) => (
        <span
          key={piece.id}
          className="absolute top-0 block rounded-[2px] shadow-[0_0_8px_rgba(247,209,23,0.38)]"
          style={{
            left: piece.left,
            top: piece.start,
            width: piece.width,
            height: piece.height,
            background: "linear-gradient(115deg,#fff7b0 0%,#f7d117 32%,#b98a08 58%,#fff1a0 76%,#d2a20a 100%)",
            animation: `championConfettiFall ${piece.duration} cubic-bezier(0.16,0.78,0.28,1) ${piece.delay} 1 forwards, championConfettiShine 0.72s ease-in-out ${piece.delay} 5 alternate`,
            "--drift": piece.drift,
            "--rotate": piece.rotate,
          }}
        />
      ))}
    </div>
  );
}

function EndMatchModal({ result, fixture, onNext, onDismiss, onOpenMenu, onOpenTrophies, hasNewTrophy = false, groupRows, qualifiedTeams, userTeam, selectedGroup, stageLabel, userForm, shareCaptureRef, podium, username = "" }) {
  const isKnockout = !result.week;
  const userInKnockout = result.home === userTeam || result.away === userTeam;
  const homeIsUser = result.home === userTeam;
  const awayIsUser = result.away === userTeam;
  const tightTeamStyle = (team) => (/bosnia/i.test(team || "") ? { letterSpacing: "-0.02em" } : undefined);
  const shareFrameRef = useRef(null);
  const [shareBlob, setShareBlob] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const [sharePreviewUrl, setSharePreviewUrl] = useState("");
  const canShareResult = Boolean(result);
  const campaignPointsTotal = getCampaignPointsTotal({ result, groupRows, userTeam, userForm });
  const activeBadgeMode = getPodiumBadgeMode({ result, fixture, stageLabel, podium, team: userTeam });
  const resultShareState = useMemo(() => getResultShareState({ result, userTeam, stageLabel, userForm, groupRows, qualifiedTeams, username }), [result, userTeam, stageLabel, userForm, groupRows, qualifiedTeams, username]);
  const resultActionButtonClass = "mx-auto grid h-[clamp(48px,5.6dvh,66px)] min-h-[48px] w-full place-items-center rounded-[clamp(14px,2.2vh,28px)] border border-[#F5F1E8]/45 bg-[#F7D117] px-4 text-center home-copy-bold text-[clamp(14px,2dvh,23px)] font-black uppercase leading-none tracking-[0.14em] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.26),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65";
  const resultIconButtonClass = "grid h-[clamp(48px,5.6dvh,66px)] min-h-[48px] w-full place-items-center rounded-[clamp(14px,2.2vh,28px)] border border-[#F5F1E8]/45 bg-[#F7D117] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.22),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65";

  const buildShareBlob = () => {
    if (!shareFrameRef.current) throw new Error("Match share exporter was not ready");
    return captureShareElementBlob(shareFrameRef.current, userTeam, null);
  };

  useEffect(() => {
    setShareBlob(null);
    setSharePreviewOpen(false);
  }, [result, resultShareState]);

  useEffect(() => {
    if (!shareBlob) {
      setSharePreviewUrl("");
      return undefined;
    }
    const url = URL.createObjectURL(shareBlob);
    setSharePreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [shareBlob]);

  const ensureShareBlob = async () => {
    if (shareBlob) return shareBlob;
    const blob = await buildShareBlob();
    setShareBlob(blob);
    return blob;
  };

  const openSharePreview = async () => {
    setSharePreviewOpen(true);
    if (shareBlob) return;
    setShareBusy(true);
    try {
      await ensureShareBlob();
    } catch (error) {
      console.error("Share preview failed", error);
      window.alert("Sorry, the result preview could not be created. Please try again.");
      setSharePreviewOpen(false);
    } finally {
      setShareBusy(false);
    }
  };

  const handleShare = async () => {
    setShareBusy(true);
    try {
      const blob = await ensureShareBlob();
      await shareOrDownloadResult({ blob });
    } catch (error) {
      console.error("Share result failed", error);
      window.alert("Sorry, the result image could not be shared. Please try again.");
    } finally {
      setShareBusy(false);
    }
  };



  const headerTitle = sharePreviewOpen ? "SHARE" : normaliseThirdPlaceCopy(modalHeaderTitle({ isKnockout, stageLabel, selectedGroup }));
  const ResultNavIcon = hasNewTrophy && onOpenTrophies ? TrophyIcon : MenuIcon;
  const handleResultNav = hasNewTrophy && onOpenTrophies ? onOpenTrophies : onOpenMenu;

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[#031B12]/78 px-3 py-[max(14px,env(safe-area-inset-top))] backdrop-blur-[7px]">
      {activeBadgeMode === PODIUM_BADGE_MODE.CHAMPION && <ChampionConfetti />}
      <div className="pointer-events-none fixed left-[-10000px] top-0 h-[400px] w-[400px] overflow-hidden" aria-hidden="true">
        <div ref={shareFrameRef} data-share-layout="match" className="h-full w-full overflow-hidden bg-[#0d6c3d]">
          <ShareMatchPreview {...resultShareState} />
        </div>
      </div>

      <div className="relative z-[1] flex w-full max-w-sm flex-col items-stretch">
        {!sharePreviewOpen && (
          <div className="mb-2 flex justify-center" style={{ "--result-rail-size": "clamp(12px,3.4vw,18px)" }}>
            <FormTracker form={userForm} />
          </div>
        )}

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
            <div className="mb-3 grid h-11 grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-2">
              {sharePreviewOpen ? (
                <button type="button" onClick={() => setSharePreviewOpen(false)} aria-label="Back to result options" className="grid h-10 w-10 place-items-center justify-self-start rounded-[0.85rem] bg-[#031B12]/46 text-[#F5F1E8]">
                  <BackArrowIcon className="h-7 w-7" />
                </button>
              ) : (
                <div className="grid h-10 w-10 place-items-center justify-self-start">
                  <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="h-10 w-10 object-contain drop-shadow-[0_5px_8px_rgba(0,0,0,0.3)]" draggable={false} />
                </div>
              )}
              <div className="home-copy-bold self-center text-center text-[clamp(20px,5.4vw,25px)] uppercase leading-none tracking-[0.1em] text-[#F5F1E8]">{headerTitle}</div>
              <button type="button" onClick={onDismiss} aria-label="Close result" className="grid h-10 w-10 place-items-center justify-self-end rounded-[0.85rem] bg-[#031B12]/46 text-[#F5F1E8]">
                <CloseIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="rounded-[1.35rem] border border-[#F5F1E8]/12 bg-[#031B12]/24 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="mb-2 grid min-h-[36px] grid-cols-[34px_minmax(0,1fr)_34px] items-center gap-2 rounded-[1rem] border border-[#F5F1E8]/10 bg-[#052D1D]/58 px-2 py-1.5">
                <div className="grid h-8 w-8 place-items-center justify-self-start">
                  <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="h-8 w-8 object-contain" draggable={false} />
                </div>
                <div className="home-copy-bold truncate text-center text-[11px] uppercase leading-none tracking-[0.12em] text-[#F7D117]">{headerTitle}</div>
                <button type="button" onClick={onDismiss} aria-label="Close result" className="grid h-8 w-8 place-items-center justify-self-end rounded-[0.7rem] bg-[#031B12]/44 text-[#F5F1E8]">
                  <CloseIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="max-h-[calc(100dvh-238px)] overflow-y-auto">
                {!sharePreviewOpen && (isKnockout ? (
                  <div className={`rounded-[1.25rem] px-2.5 py-3 ${userInKnockout ? "border border-[#F7D117]/70 bg-[#072D1D] text-[#F5F1E8] ring-1 ring-[#F7D117]/32 shadow-[0_0_12px_rgba(247,209,23,0.10),0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)]" : "bg-[#F5F1E8]/90 text-[#26352E] ring-1 ring-[#F5F1E8]/10"}`}>
                    <div className={`grid min-h-[32px] grid-cols-[24px_minmax(0,1fr)_32px_minmax(0,1fr)_24px] items-center gap-1 home-main-font text-[clamp(13px,3.4vw,15px)] uppercase leading-none ${userInKnockout ? "text-[#F5F1E8]" : "text-[#26352E]"}`}>
                      <div className="flex items-center justify-center"><Flag team={result.home} className={`h-[18px] w-[25px] rounded-[4px] ring-1 ${homeIsUser ? "ring-[#F7D117]/85" : "ring-[#F5F1E8]/35"}`} /></div>
                      <span className={`block min-w-0 truncate text-center home-copy-regular ${homeIsUser ? "text-[#F7D117]" : userInKnockout ? "text-[#F5F1E8]" : "text-[#26352E]"}`} style={tightTeamStyle(result.home)} title={result.home}>{result.home}</span>
                      <span className={`flex items-center justify-center home-copy-bold tabular-nums leading-none ${userInKnockout ? "text-[#F5F1E8]" : "text-[#0B5F35]"}`}>{result.homeGoals}-{result.awayGoals}</span>
                      <span className={`block min-w-0 truncate text-center home-copy-regular ${awayIsUser ? "text-[#F7D117]" : userInKnockout ? "text-[#F5F1E8]" : "text-[#26352E]"}`} style={tightTeamStyle(result.away)} title={result.away}>{result.away}</span>
                      <div className="flex items-center justify-center"><Flag team={result.away} className={`h-[18px] w-[25px] rounded-[4px] ring-1 ${awayIsUser ? "ring-[#F7D117]/85" : "ring-[#F5F1E8]/35"}`} /></div>
                    </div>
                  </div>
                ) : (
                  <StandingsMiniTable rows={groupRows} qualifiedTeams={qualifiedTeams} userTeam={userTeam} />
                ))}

                {sharePreviewOpen ? (
                  <div className="space-y-2.5">
                    <div className="mx-auto aspect-square w-full overflow-hidden rounded-[1.1rem] border border-[#F5F1E8]/10 bg-[#0d6c3d] shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)]" data-share-layout="match-preview-modal">
                      {sharePreviewUrl ? (
                        <img src={sharePreviewUrl} alt="Monday Cup result preview" className="h-full w-full object-cover" draggable={false} />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center px-6 text-center home-copy-bold text-[13px] uppercase tracking-[0.14em] text-[#F5F1E8]">Preparing preview</div>
                      )}
                    </div>
                    <button type="button" onClick={handleShare} disabled={shareBusy} className={resultActionButtonClass}>
                      {shareBusy ? "PREPARING" : "SAVE AS PHOTO"}
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-[1rem] border border-[#F7D117]/30 bg-[#031B12]/42 px-3 py-3 text-left">
                      <div className="home-copy-bold text-[10px] uppercase tracking-[0.12em] text-[#F5F1E8]/72">Game score</div>
                      <div className="home-copy-bold text-[24px] uppercase leading-none tracking-[0.08em] text-[#F7D117] tabular-nums">{Number(campaignPointsTotal || 0)}</div>
                    </div>
                    <div className="mt-2.5 grid grid-cols-[54px_minmax(0,1fr)_54px] items-center gap-2.5">
                      <button type="button" onClick={openSharePreview} disabled={!canShareResult || shareBusy} className={resultIconButtonClass} aria-label="Share result">
                        <ShareIcon />
                      </button>
                      <button type="button" onClick={onNext} disabled={false} className={resultActionButtonClass}>
                        {modalButton(result)}
                      </button>
                      <button type="button" onClick={handleResultNav || onDismiss} className={resultIconButtonClass} aria-label={hasNewTrophy ? "Open trophies" : "Open menu"}>
                        <ResultNavIcon />
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


export default EndMatchModal;
