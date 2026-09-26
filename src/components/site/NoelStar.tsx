const POINTS = Array.from({ length: 16 }, (_, i) => {
  const radius = i % 2 ? 3.6 : 11;
  const angle = (Math.PI * i) / 8 - Math.PI / 2;
  return `${(12 + radius * Math.cos(angle)).toFixed(2)},${(12 + radius * Math.sin(angle)).toFixed(2)}`;
}).join(" ");

/** Étoile à huit branches au trait fin, rappel de l'étoile en papier du décor. */
export function NoelStar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="0.8"
      strokeLinejoin="round"
    >
      <polygon points={POINTS} />
    </svg>
  );
}
