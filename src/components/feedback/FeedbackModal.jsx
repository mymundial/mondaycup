import { useEffect, useState } from "react";

function CloseIcon({ className = "h-6 w-6" }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12" />
      <path d="M18 6L6 18" />
    </svg>
  );
}

function StarButton({ index, selected, onSelect }) {
  return (
    <button type="button" onClick={() => onSelect(index)} className={`grid h-12 w-12 place-items-center rounded-[0.9rem] border text-[34px] leading-none transition ${selected ? "border-[#F7D117]/80 bg-[#F7D117]/12 text-[#F7D117] shadow-[0_0_12px_rgba(247,209,23,0.26)]" : "border-[#F5F1E8]/12 bg-[#031B12]/54 text-[#F5F1E8]/26"}`} aria-label={`Rate ${index} star${index === 1 ? "" : "s"}`}>★</button>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#020805]/76 px-4 py-6 backdrop-blur-[3px]">
      <div className="relative w-full max-w-[420px] overflow-hidden rounded-[1.45rem] border border-[#F7D117]/34 bg-[#07351F] p-3 text-[#F5F1E8] shadow-[0_24px_60px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)] ring-1 ring-[#F5F1E8]/10">
        <div className="rounded-[1.15rem] border border-[#F5F1E8]/12 bg-[#041F14]/82 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          <div className="relative mb-3 flex min-h-[42px] items-center justify-center rounded-[0.95rem] border border-[#F7D117]/28 bg-[#031B12]/86 px-12">
            <div className="home-copy-bold text-center text-[17px] uppercase leading-none tracking-[0.16em] text-[#F7D117]">MONDAY CUP</div>
            <button type="button" onClick={onDismiss} className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-[0.65rem] border border-[#F5F1E8]/14 bg-[#031B12] text-[#F5F1E8]/82" aria-label="Dismiss feedback"><CloseIcon /></button>
          </div>

          {submitted ? (
            <div className="px-2 py-4 text-center">
              <div className="home-copy-bold text-[24px] uppercase leading-none tracking-[0.14em] text-[#F7D117]">THANK YOU</div>
              <div className="home-copy-regular mx-auto mt-3 max-w-[290px] text-[11px] uppercase leading-[1.55] tracking-[0.12em] text-[#F5F1E8]/76">YOUR FEEDBACK HAS BEEN RECEIVED.</div>
              <button type="button" onClick={onDismiss} className="home-copy-bold mt-5 h-12 w-full rounded-[0.95rem] border border-[#F5F1E8]/42 bg-[#F7D117] px-4 text-[14px] uppercase leading-none tracking-[0.14em] text-[#072D1D] shadow-[0_8px_18px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.25)]">CONTINUE</button>
            </div>
          ) : (
            <div className="px-1 pb-1 pt-2 text-center">
              <div className="home-copy-bold text-[20px] uppercase leading-[1.05] tracking-[0.12em] text-[#F5F1E8]">{isSecondPrompt ? "THANKS FOR PLAYING" : "ENJOYING MONDAY CUP?"}</div>
              <div className="home-copy-regular mx-auto mt-3 max-w-[315px] text-[10px] uppercase leading-[1.55] tracking-[0.12em] text-[#F5F1E8]/72">{isSecondPrompt ? "HOW WOULD YOU RATE YOUR MONDAY CUP EXPERIENCE?" : "YOUR FEEDBACK HELPS SHAPE FUTURE TOURNAMENTS."}</div>

              <div className="mt-5 flex justify-center gap-1.5">{[1, 2, 3, 4, 5].map((star) => <StarButton key={star} index={star} selected={star <= rating} onSelect={setRating} />)}</div>

              {rating ? <textarea value={comment} onChange={(event) => setComment(event.target.value.slice(0, 280))} placeholder="ANY COMMENTS?" className="home-copy-regular mt-4 min-h-[82px] w-full resize-none rounded-[0.95rem] border border-[#F5F1E8]/14 bg-[#031B12]/76 px-3 py-3 text-[11px] uppercase leading-[1.45] tracking-[0.1em] text-[#F5F1E8] outline-none placeholder:text-[#F5F1E8]/34 focus:border-[#F7D117]/60" /> : null}

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button type="button" onClick={onDismiss} className="home-copy-bold h-12 rounded-[0.95rem] border border-[#F5F1E8]/18 bg-[#031B12]/82 px-3 text-[12px] uppercase leading-none tracking-[0.13em] text-[#F5F1E8]/86">NOT NOW</button>
                <button type="button" disabled={!rating} onClick={handleSubmit} className="home-copy-bold h-12 rounded-[0.95rem] border border-[#F5F1E8]/42 bg-[#F7D117] px-3 text-[12px] uppercase leading-none tracking-[0.13em] text-[#072D1D] shadow-[0_8px_18px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.26)] disabled:cursor-default disabled:opacity-45">SUBMIT</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
