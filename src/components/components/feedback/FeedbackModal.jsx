import { useEffect, useState } from "react";
import { mcExtendedPitchMowBackground } from "../../styles/theme.js";

const MONDAY_CUP_SHIELD_SRC = "/assets/branding/monday-cup.png";

function CloseIcon({ className = "h-7 w-7" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function StarButton({ index, selected, onSelect }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(index)}
      className={`grid h-[52px] w-[52px] place-items-center rounded-[1rem] border text-[38px] leading-none transition ${
        selected
          ? "border-[#F7D117]/80 bg-[#F7D117] text-[#072D1D] shadow-[0_0_16px_rgba(247,209,23,0.32),inset_0_2px_8px_rgba(255,255,255,0.24)]"
          : "border-[#F5F1E8]/18 bg-[#031B12]/42 text-[#F5F1E8]/36 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]"
      }`}
      aria-label={`Rate ${index} star${index === 1 ? "" : "s"}`}
    >
      ★
    </button>
  );
}

export default function FeedbackModal({ open = false, promptType = "prompt1", onSubmit, onDismiss }) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (!open) return;
    setRating(0);
    setComment("");
    setSubmitted(false);
  }, [open, promptType]);

  if (!open) return null;

  const isSecondPrompt = promptType === "prompt2";
  const handleSubmit = () => {
    if (!rating) return;
    setSubmitted(true);
    onSubmit?.({ rating, comment: comment.trim(), promptType });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020805]/72 px-4 py-6 backdrop-blur-[3px]">
      <div
        className="relative w-full max-w-[430px] overflow-hidden rounded-[2rem] border border-[#F5F1E8]/18 bg-[#0d6c3d] p-5 text-[#F5F1E8] shadow-[0_26px_70px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.1)] ring-1 ring-[#F7D117]/12"
        style={mcExtendedPitchMowBackground}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_14%,rgba(247,209,23,0.10),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.13))]" aria-hidden="true" />

        <div className="relative z-10 grid min-h-[56px] grid-cols-[56px_minmax(0,1fr)_56px] items-center gap-2">
          <img
            src={MONDAY_CUP_SHIELD_SRC}
            alt="Monday Cup"
            className="h-12 w-12 justify-self-start object-contain drop-shadow-[0_6px_10px_rgba(0,0,0,0.35)]"
            draggable="false"
          />

          <div className="home-copy-bold min-w-0 text-center text-[21px] uppercase leading-[1.05] tracking-[0.13em] text-[#F5F1E8]">
            {isSecondPrompt ? "THANKS FOR PLAYING" : "ENJOYING MONDAY CUP?"}
          </div>

          <button
            type="button"
            onClick={onDismiss}
            className="grid h-12 w-12 place-items-center justify-self-end text-[#F5F1E8]/92 drop-shadow-[0_2px_5px_rgba(0,0,0,0.35)] active:scale-[0.96]"
            aria-label="Dismiss feedback"
          >
            <CloseIcon />
          </button>
        </div>

        {submitted ? (
          <div className="relative mt-6 rounded-[1.55rem] border border-[#F5F1E8]/14 bg-[#031B12]/44 px-4 py-6 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
            <div className="home-copy-bold text-[26px] uppercase leading-none tracking-[0.14em] text-[#F7D117]">THANK YOU</div>
            <div className="home-copy-regular mx-auto mt-3 max-w-[290px] text-[11px] uppercase leading-[1.55] tracking-[0.12em] text-[#F5F1E8]/78">YOUR FEEDBACK HAS BEEN RECEIVED.</div>
            <button type="button" onClick={onDismiss} className="home-copy-bold mt-5 h-12 w-full rounded-[1rem] border border-[#F5F1E8]/42 bg-[#F7D117] px-4 text-[14px] uppercase leading-none tracking-[0.14em] text-[#072D1D] shadow-[0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.25)]">CONTINUE</button>
          </div>
        ) : (
          <div className="relative mt-6 rounded-[1.55rem] border border-[#F5F1E8]/14 bg-[#031B12]/44 px-4 pb-4 pt-7 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
            <div className="home-copy-regular mx-auto max-w-[315px] text-[10px] uppercase leading-[1.55] tracking-[0.12em] text-[#F5F1E8]/74">{isSecondPrompt ? "HOW WOULD YOU RATE YOUR MONDAY CUP EXPERIENCE?" : "YOUR FEEDBACK HELPS SHAPE FUTURE TOURNAMENTS."}</div>

            <div className="mt-6 flex justify-center gap-2">{[1, 2, 3, 4, 5].map((star) => <StarButton key={star} index={star} selected={star <= rating} onSelect={setRating} />)}</div>

            {rating ? <textarea value={comment} onChange={(event) => setComment(event.target.value.slice(0, 280))} placeholder="ANY COMMENTS?" className="home-copy-regular mt-4 min-h-[82px] w-full resize-none rounded-[1rem] border border-[#F5F1E8]/14 bg-[#031B12]/70 px-3 py-3 text-[11px] uppercase leading-[1.45] tracking-[0.1em] text-[#F5F1E8] outline-none placeholder:text-[#F5F1E8]/34 focus:border-[#F7D117]/60" /> : null}

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={onDismiss} className="home-copy-bold h-12 rounded-[1rem] border border-[#F5F1E8]/18 bg-[#031B12]/74 px-3 text-[12px] uppercase leading-none tracking-[0.13em] text-[#F5F1E8]/86">NOT NOW</button>
              <button type="button" disabled={!rating} onClick={handleSubmit} className="home-copy-bold h-12 rounded-[1rem] border border-[#F5F1E8]/42 bg-[#F7D117] px-3 text-[12px] uppercase leading-none tracking-[0.13em] text-[#072D1D] shadow-[0_8px_18px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.26)] disabled:cursor-default disabled:opacity-45">SUBMIT</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
