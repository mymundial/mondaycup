import { ASSETS } from "../data/assets.js";
import { FLAG_CC, teamCode } from "../data/teams.js";

export function Flag({ team, className = "h-4 w-6" }) {
  const cc = FLAG_CC[team];
  const localSrc = team ? `/flags/${teamCode(team)}.png` : "";
  const fallbackSrc = cc ? `https://flagcdn.com/w40/${cc}.png` : "";
  return <span className={`relative flex ${className} shrink-0 items-center justify-center overflow-hidden rounded bg-[#0B5F35] text-[8px] font-black text-[#F5F0E6]`}>
    {team ? <img alt="" src={localSrc} className="h-full w-full object-cover" onError={(e) => { if (fallbackSrc && e.currentTarget.src !== fallbackSrc) e.currentTarget.src = fallbackSrc; else e.currentTarget.style.display = "none"; }} /> : String(team || "TBC").slice(0, 3).toUpperCase()}
  </span>;
}

export function BrandMark() { return <img src={ASSETS.myMundialLogo} alt="Brothers" className="h-[26px] w-auto max-w-[148px] object-contain opacity-95 drop-shadow-[0_3px_8px_rgba(0,0,0,0.24)]" draggable={false} />; }
export function MondayLogo({ small = false }) { return <span className={`${small ? "h-14 w-14" : "h-[132px] w-[132px]"} inline-flex items-center justify-center overflow-hidden`}><img src={ASSETS.mondayLogo} alt="Monday Cup" className="h-full w-full select-none object-contain opacity-95" draggable={false} /></span>; }
export function HamburgerIcon() { return <span className="relative flex h-[14px] w-[18px] flex-col items-center justify-between"><span className="block h-[2px] w-full rounded-full bg-current" /><span className="block h-[2px] w-full rounded-full bg-current" /><span className="block h-[2px] w-full rounded-full bg-current" /></span>; }
