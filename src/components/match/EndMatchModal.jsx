import { useEffect, useState } from "react";
import { ASSETS } from "../../data/assets.js";
import { Flag } from "../shared.jsx";
import {
  modalButton,
  modalHeaderTitle,
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
    <div className={`flex items-center justify-center gap-[clamp(3px,1vw,7px)] ${className}`}>
      {Array.from({ length: 8 }).map((_, index) => (
        <span key={index} className={`h-[clamp(10px,3.2vw,18px)] w-[clamp(10px,3.2vw,18px)] rounded-full ${ledClass(form[index])}`} />
      ))}
    </div>
  );
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
          <div key={row.team} className={`mb-1 grid items-center gap-[3px] rounded-xl border px-2 py-[5px] text-center text-[12px] leading-none last:mb-0 ring-1 ${isUser ? "border-[#F5F1E8]/20 bg-[#072D1D] text-[#F5F1E8] ring-[#F7D117]/18 shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)]" : "border-[#F5F1E8]/65 bg-[#F5F1E8] text-[#26352E] ring-[#F5F1E8]/18"}`} style={{ gridTemplateColumns: tableColumns }}>
            <span className={`home-copy-regular ${isUser ? "text-[#F7D117]" : ""}`}>{index + 1}</span>
            <span className="flex justify-center"><Flag team={row.team} className="h-4 w-6 rounded-[4px] ring-1 ring-[#F5F1E8]/35" /></span>
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

function EndMatchModal({ result, fixture, onNext, onDismiss, groupRows, qualifiedTeams, userTeam, selectedGroup, stageLabel, userForm, shareCaptureRef, podium }) {
  const isKnockout = !result.week;
  const userInKnockout = result.home === userTeam || result.away === userTeam;
  const homeIsUser = result.home === userTeam;
  const awayIsUser = result.away === userTeam;
  const tightTeamStyle = (team) => (/bosnia/i.test(team || "") ? { letterSpacing: "-0.02em" } : undefined);
  const [shareBlob, setShareBlob] = useState(null);
  const [shareBusy, setShareBusy] = useState(false);
  const [sharePreviewOpen, setSharePreviewOpen] = useState(false);
  const [sharePreviewUrl, setSharePreviewUrl] = useState("");
  const canShareResult = isTerminalShareResult({ result, fixture, stageLabel, podium, team: userTeam });
  const campaignPointsTotal = getCampaignPointsTotal({ result, groupRows, userTeam, userForm });
  const activeBadgeMode = getPodiumBadgeMode({ result, fixture, stageLabel, podium, team: userTeam });

  const buildShareBlob = () => captureShareElementBlob(shareCaptureRef?.current, userTeam, activeBadgeMode);

  useEffect(() => {
    let active = true;
    setShareBlob(null);
    setSharePreviewOpen(false);
    if (!canShareResult) return undefined;
    window.requestAnimationFrame(() => {
      buildShareBlob().then((blob) => {
        if (active) setShareBlob(blob);
      }).catch(() => {
        if (active) setShareBlob(null);
      });
    });
    return () => { active = false; };
  }, [canShareResult, result, shareCaptureRef]);

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



  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-[#072D1D]/48 px-3 pb-[max(14px,env(safe-area-inset-bottom))] pt-[calc(78px+env(safe-area-inset-top))]">
      <div className="flex w-full max-w-sm flex-col items-stretch">
        {!sharePreviewOpen && (
          <div className="mx-auto mb-[14px] grid w-[78%] grid-cols-[minmax(0,1fr)_minmax(82px,96px)] items-center gap-2">
            <div className="relative flex h-10 min-w-0 items-center justify-center overflow-hidden rounded-[0.32rem] border border-[#F5F1E8]/22 bg-[#050505]/58 px-[clamp(8px,2vw,12px)] py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
              <div className="relative z-[1]"><FormTracker form={userForm} /></div>
            </div>
            <div className="relative flex h-10 min-w-0 items-center justify-center overflow-hidden rounded-[0.32rem] border border-[#F5F1E8]/22 bg-[#050505]/58 px-[clamp(8px,2vw,12px)] py-0 shadow-[inset_0_1px_0_rgba(245,241,232,0.08)]">
              <span className="relative z-[1] font-led text-[clamp(10px,3.2vw,18px)] leading-none text-[#F7D117] led-text-glow tabular-nums">{campaignPointsTotal}</span>
            </div>
          </div>
        )}
        <div className="relative w-full max-h-[calc(100dvh-150px)] overflow-visible rounded-[2rem] border border-[#F5F1E8]/14 bg-[#0B5F35]/94 text-center text-[#F5F1E8] shadow-[0_10px_26px_rgba(0,0,0,0.22),inset_0_-2px_6px_rgba(0,0,0,0.06)]">
        <div className="overflow-hidden rounded-t-[2rem] bg-[#0B5F35]/0 px-4 pb-1.5 pt-2 text-[#F5F0E6] sm:px-5">
          <div className="grid grid-cols-[40px_minmax(0,1fr)_40px] items-center gap-3">
            {sharePreviewOpen ? (
              <button
                type="button"
                onClick={() => setSharePreviewOpen(false)}
                aria-label="Back to result options"
                className="flex h-9 w-9 items-center justify-center justify-self-start text-[#F5F0E6]"
              >
                <BackArrowIcon className="h-7 w-7" />
              </button>
            ) : (
              <div className="flex h-9 w-9 items-center justify-center">
                <img src={ASSETS.branding.mondayLogo} alt="Monday Cup" className="h-full w-full object-contain" draggable={false} />
              </div>
            )}
            <div className="text-center home-copy-bold text-[clamp(21px,5.8vw,25px)] uppercase leading-[0.95] tracking-[0.06em] text-[#F5F0E6]">{sharePreviewOpen ? "SHARE" : normaliseThirdPlaceCopy(modalHeaderTitle({ isKnockout, stageLabel, selectedGroup }))}</div>
            <button onClick={onDismiss} aria-label="Close result" className="flex h-9 w-9 items-center justify-center justify-self-end text-[#F5F0E6]">
              <CloseIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        <div className="max-h-[calc(100dvh-220px)] overflow-y-auto px-4 pb-4 pt-1.5 sm:px-5">
          {!sharePreviewOpen && (isKnockout ? (
            <>
              <div className={`mt-1 rounded-[1.25rem] px-2.5 py-3 ${userInKnockout ? "border border-[#F5F1E8]/22 bg-[#072D1D] text-[#F5F1E8] ring-1 ring-[#F7D117]/18 shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)]" : "bg-[#F5F1E8]/90 text-[#26352E] ring-1 ring-[#F5F1E8]/10"}`}>
                <div className={`grid min-h-[32px] grid-cols-[24px_minmax(0,1fr)_32px_minmax(0,1fr)_24px] items-center gap-1 home-main-font text-[clamp(13px,3.4vw,15px)] uppercase leading-none ${userInKnockout ? "text-[#F5F1E8]" : "text-[#26352E]"}`}>
                  <div className="flex items-center justify-center"><Flag team={result.home} className="h-[18px] w-[25px] rounded-[4px] ring-1 ring-[#F5F1E8]/35" /></div>
                  <span className={`block min-w-0 truncate text-center home-copy-regular ${homeIsUser ? "text-[#F7D117]" : userInKnockout ? "text-[#F5F1E8]" : "text-[#26352E]"}`} style={tightTeamStyle(result.home)} title={result.home}>{result.home}</span>
                  <span className={`flex items-center justify-center home-copy-bold tabular-nums leading-none ${userInKnockout ? "text-[#F5F1E8]" : "text-[#0B5F35]"}`}>{result.homeGoals}-{result.awayGoals}</span>
                  <span className={`block min-w-0 truncate text-center home-copy-regular ${awayIsUser ? "text-[#F7D117]" : userInKnockout ? "text-[#F5F1E8]" : "text-[#26352E]"}`} style={tightTeamStyle(result.away)} title={result.away}>{result.away}</span>
                  <div className="flex items-center justify-center"><Flag team={result.away} className="h-[18px] w-[25px] rounded-[4px] ring-1 ring-[#F5F1E8]/35" /></div>
                </div>
              </div>
            </>
          ) : (
            <>
              <StandingsMiniTable rows={groupRows} qualifiedTeams={qualifiedTeams} userTeam={userTeam} />
            </>
          ))}

          {canShareResult && sharePreviewOpen ? (
            <div className="mt-1.5 space-y-2.5">
              <div className="mx-auto aspect-square w-full overflow-hidden border border-[#F5F1E8]/22 bg-[#072D1D] p-[3px] shadow-[0_8px_18px_rgba(0,0,0,0.14),inset_0_1px_0_rgba(245,241,232,0.08)] ring-1 ring-[#0B5F35]/45">
                <div className="relative h-full w-full overflow-hidden bg-[#0B5F35]">
                  {sharePreviewUrl ? (
                    <img src={sharePreviewUrl} alt="Monday Cup result preview" className="h-full w-full object-cover" draggable={false} />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center px-6 text-center home-copy-bold text-[13px] uppercase tracking-[0.14em] text-[#F5F1E8]">Preparing preview</div>
                  )}
                  <div className="pointer-events-none absolute inset-0 ring-1 ring-[#F5F1E8]/16" aria-hidden="true" />
                </div>
              </div>
              <button type="button" onClick={handleShare} disabled={shareBusy} className="mx-auto grid h-[clamp(44px,5.1dvh,62px)] min-h-[44px] w-full place-items-center rounded-[clamp(14px,2.2vh,28px)] border border-[#F5F1E8]/45 bg-[#F7D117] px-4 text-center home-copy-bold text-[clamp(14px,2dvh,23px)] font-black uppercase leading-none tracking-[0.14em] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.26),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65">
                {shareBusy ? "PREPARING" : "EXPORT"}
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={canShareResult ? openSharePreview : onNext}
              disabled={canShareResult && shareBusy}
              className="mx-auto mt-2.5 grid h-[clamp(44px,5.1dvh,62px)] min-h-[44px] w-full place-items-center rounded-[clamp(14px,2.2vh,28px)] border border-[#F5F1E8]/45 bg-[#F7D117] px-4 text-center home-copy-bold text-[clamp(14px,2dvh,23px)] font-black uppercase leading-none tracking-[0.14em] text-[#072D1D] shadow-[0_0_10px_rgba(247,209,23,0.26),0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.24)] ring-1 ring-[#F7D117]/35 disabled:cursor-default disabled:opacity-65"
            >
              {canShareResult ? (shareBusy ? "PREPARING" : "SHARE YOUR RESULT") : modalButton(result)}
            </button>
          )}
        </div>
      </div>
    </div>
    </div>
  );
}


export default EndMatchModal;
