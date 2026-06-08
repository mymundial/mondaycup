export function PitchPageBackground({ className = "" }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 bg-[#0d6c3d] ${className}`}
      style={{
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(245,241,232,0.055) 0%, rgba(245,241,232,0.055) 10%, rgba(11,45,29,0.08) 10%, rgba(11,45,29,0.08) 20%), linear-gradient(rgba(245,241,232,0.03), rgba(11,45,29,0.06))",
      }}
      aria-hidden="true"
    />
  );
}
