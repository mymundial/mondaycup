import SharedCrowdBackdrop from "../crowd/SharedCrowdBackdrop.jsx";
import { ASSETS } from "../../data/assets.js";
import { MC_SELECTION_LAYOUT, mcExtendedPitchMowBackground } from "../../styles/theme.js";

const TOP_BAR_HEIGHT = MC_SELECTION_LAYOUT.topBarHeight;
const SCOREBOARD_RATIO = MC_SELECTION_LAYOUT.scoreboardRatio;
const TICKER_RATIO = MC_SELECTION_LAYOUT.tickerRatio;
const GOAL_TOP = MC_SELECTION_LAYOUT.goalTopPercent;
const GOAL_HEIGHT = MC_SELECTION_LAYOUT.goalHeightPercent;
const GOAL_WIDTH = MC_SELECTION_LAYOUT.goalWidthPercent;
const GOAL_LEFT = MC_SELECTION_LAYOUT.goalLeftPercent;
const AD_BOARD_HEIGHT = MC_SELECTION_LAYOUT.adBoardHeightPercent;
const GOAL_LINE = GOAL_TOP + GOAL_HEIGHT;
const AD_BOARD_TOP = GOAL_LINE - AD_BOARD_HEIGHT;
const FOOTER_HEIGHT = 52;

function PitchMow({ top = "0", bottom = "0" }) {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-[1]"
      style={{
        top,
        bottom,
...mcExtendedPitchMowBackground,
      }}
      aria-hidden="true"
    />
  );
}

function TopBarBand({ title = "" }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-[20] flex items-center justify-center overflow-hidden text-[#F5F1E8] shadow-[0_2px_8px_rgba(0,0,0,0.16)]"
      style={{ height: TOP_BAR_HEIGHT, background: "#06351f" }}
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.16))]" />
      {title ? <div className="home-copy-bold relative z-[1] text-[clamp(25px,6.1vw,34px)] uppercase leading-none tracking-[0.15em]">{title}</div> : null}
    </div>
  );
}

function ScoreboardBand({ home = false }) {
  const scoreboardHeight = `calc((100dvh - ${TOP_BAR_HEIGHT}px) * ${SCOREBOARD_RATIO})`;
  const tickerHeight = `calc(${scoreboardHeight} * ${TICKER_RATIO})`;
  const mainHeight = `calc(${scoreboardHeight} - ${tickerHeight})`;
  return (
    <div
      className="pointer-events-none absolute inset-x-0 z-[18] overflow-hidden"
      style={{ top: TOP_BAR_HEIGHT, height: scoreboardHeight }}
      aria-hidden="true"
    >
      <div className="relative overflow-hidden border-y border-[#F5F1E8]/18 bg-[#050505] shadow-[0_2px_8px_rgba(0,0,0,0.20)]" style={{ height: mainHeight }}>
        <div
          className="absolute left-[2px] right-[2px] top-[2px] bottom-[2px] opacity-50"
          style={{
            backgroundImage: "radial-gradient(circle at center, rgba(247,209,23,0.24) 0.72px, transparent 1.44px)",
            backgroundSize: "6px calc(100% / 12)",
            backgroundPosition: "center top",
            backgroundRepeat: "repeat",
          }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(11,95,53,0.10),rgba(247,209,23,0.035),rgba(11,95,53,0.10))]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.18))]" />
        {home ? (
          <div className="relative z-[1] flex h-full items-center justify-center">
            <div className="led-text-glow font-led text-[clamp(17px,3.1vh,34px)] uppercase leading-none tracking-tight text-[#F7D117]">MONDAY CUP</div>
          </div>
        ) : null}
      </div>
      <div
        className="relative flex items-center justify-center overflow-hidden text-center uppercase tracking-[0.085em]"
        style={{
          height: `calc(${tickerHeight} + 1px)`,
          marginTop: "-1px",
          background: "#F7D117",
          color: "#072D1D",
          fontFamily: '"SportsDINRegular", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
          fontWeight: 700,
          lineHeight: 1,
        }}
      >
        <span className="block max-w-[94%] truncate text-[clamp(13px,1.75dvh,21px)] leading-none">{home ? "INTERNATIONAL SOCCER SHOOTOUT" : "MATCH DAY"}</span>
      </div>
    </div>
  );
}

function StadiumPitch({ includeCrowd = false, belowScoreboard = false }) {
  const top = belowScoreboard
    ? `calc(${TOP_BAR_HEIGHT}px + ((100dvh - ${TOP_BAR_HEIGHT}px) * ${SCOREBOARD_RATIO}))`
    : `${TOP_BAR_HEIGHT}px`;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[5] overflow-hidden bg-[#0d6c3d]" style={{ top }} aria-hidden="true">
      {includeCrowd ? (
        <SharedCrowdBackdrop
          density={1}
          rowCount={16}
          className="pointer-events-none absolute inset-x-0 top-0 z-[0] overflow-hidden"
          style={{ height: `${AD_BOARD_TOP}%` }}
        />
      ) : null}
      {includeCrowd ? (
        <div className="absolute inset-x-0 z-[2] overflow-hidden border-t border-[#05150E] bg-[#072D1D] shadow-[0_-8px_24px_rgba(0,0,0,0.42)]" style={{ top: `${AD_BOARD_TOP}%`, height: `${AD_BOARD_HEIGHT}%` }}>
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.045),rgba(0,0,0,0.22))]" />
          <div className="relative mx-auto flex h-full max-w-[61%] items-center justify-center">
            <img src="/assets/branding/mondaycup_co_uk.png" alt="" className="relative z-[1] h-[69%] w-full object-contain opacity-[0.84]" draggable={false} />
          </div>
        </div>
      ) : null}
      <PitchMow top={includeCrowd ? `${GOAL_LINE}%` : "0"} />
      {includeCrowd ? (
        <>
          <div className="absolute left-0 right-0 z-[4] h-2 bg-[#f5f1e8]" style={{ top: `${GOAL_LINE}%` }} />
          <div className="absolute z-[3] overflow-hidden border-[8px] border-b-0 border-[#f5f1e8] bg-[#0d6c3d]/30" style={{ left: `${GOAL_LEFT}%`, top: `${GOAL_TOP}%`, width: `${GOAL_WIDTH}%`, height: `${GOAL_HEIGHT}%` }}>
            <div className="absolute inset-0 opacity-55" style={{ backgroundImage: "repeating-linear-gradient(90deg, transparent 0%, transparent 1.8%, rgba(245,241,232,0.18) 2.0%, transparent 2.2%), repeating-linear-gradient(180deg, transparent 0%, transparent 2.6%, rgba(245,241,232,0.16) 2.8%, transparent 3.1%), linear-gradient(135deg, transparent 0%, transparent 49%, rgba(245,241,232,0.08) 49.4%, transparent 50%)", backgroundSize: "100% 100%, 100% 100%, 8px 8px" }} />
          </div>
          <div className="absolute z-[3] rounded-b-[999px] border-b-[8px] border-l-[8px] border-r-[8px] border-[#f5f1e8]" style={{ left: "5%", top: `${GOAL_LINE}%`, width: "90%", height: "24.2%" }} />
          <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#f5f1e8]" style={{ left: `${MC_SELECTION_LAYOUT.penaltySpotXPercent}%`, top: `${MC_SELECTION_LAYOUT.penaltySpotYPercent}%` }} />
        </>
      ) : null}
    </div>
  );
}

function FooterBand() {
  return (
    <footer className="pointer-events-none absolute inset-x-0 bottom-0 z-[30] overflow-visible text-center" style={{ height: `calc(${FOOTER_HEIGHT}px + env(safe-area-inset-bottom))` }} aria-hidden="true">
      <div className="absolute inset-x-0 top-[-76px] h-[78px]" style={{ background: "linear-gradient(0deg, rgba(3,27,18,0.52) 0%, rgba(3,27,18,0.28) 34%, rgba(3,27,18,0.12) 64%, rgba(3,27,18,0) 100%), radial-gradient(ellipse at 50% 100%, rgba(3,27,18,0.44) 0%, rgba(3,27,18,0.24) 42%, rgba(3,27,18,0) 76%)" }} />
      <div className="relative h-full w-full overflow-hidden border-t border-[#F5F1E8]/28 shadow-[0_-18px_34px_rgba(3,27,18,0.42),0_-4px_12px_rgba(3,27,18,0.30)]" style={mcExtendedPitchMowBackground}>
        <div className="absolute inset-x-0 top-0 h-px bg-[#F5F1E8]/42 shadow-[0_1px_0_rgba(3,27,18,0.34)]" />
        <div className="relative z-[1] flex h-[52px] w-full items-center justify-center pb-[env(safe-area-inset-bottom)]">
          <img src={ASSETS.branding.myMundialLogo} alt="" className="h-[20px] w-auto max-w-[112px] object-contain opacity-82 drop-shadow-[0_2px_5px_rgba(0,0,0,0.24)]" draggable={false} />
        </div>
      </div>
    </footer>
  );
}

export default function StadiumContinuation({ mode = "menu", title = "" }) {
  if (mode === "match") {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0d6c3d]" aria-hidden="true">
        <TopBarBand title="MATCH" />
        <ScoreboardBand />
        <StadiumPitch includeCrowd belowScoreboard />
      </div>
    );
  }

  if (mode === "home") {
    return (
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0d6c3d]" aria-hidden="true">
        <TopBarBand />
        <ScoreboardBand home />
        <StadiumPitch includeCrowd belowScoreboard />
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#0d6c3d]" aria-hidden="true">
      <TopBarBand title={title} />
      <PitchMow top={`${TOP_BAR_HEIGHT}px`} bottom={`calc(${FOOTER_HEIGHT}px + env(safe-area-inset-bottom))`} />
      <FooterBand />
    </div>
  );
}
