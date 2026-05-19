import { ASSETS } from "../data/assets.js";
import { FLAG_CC } from "../data/teams.js";

export function Flag({ team, className = "h-4 w-6" }) {
  const cc = FLAG_CC[team];
  return <span className={`relative flex ${className} shrink-0 items-center justify-center overflow-hidden rounded bg-[#0B5F35] text-[8px] font-black text-[#F5F0E6]`}>
    {cc ? <img alt="" src={`https://flagcdn.com/w40/${cc}.png`} className="h-full w-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} /> : String(team || "TBC").slice(0, 3).toUpperCase()}
  </span>;
}

export function BrandMark() { return <img src={ASSETS.myMundialLogo} alt="myMUNDIAL" className="h-10 w-auto object-contain" />; }
export function MondayLogo({ small = false }) { return <img src={ASSETS.mondayLogo} alt="Monday Cup" className={`${small ? "h-20 opacity-95" : "h-[17rem] -mt-5 -mb-5 opacity-95"} w-auto select-none object-contain`} />; }
export function HamburgerIcon() { return <span className="relative flex h-[14px] w-[18px] flex-col items-center justify-between"><span className="block h-[2px] w-full rounded-full bg-current" /><span className="block h-[2px] w-full rounded-full bg-current" /><span className="block h-[2px] w-full rounded-full bg-current" /></span>; }
