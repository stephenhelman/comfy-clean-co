interface WaveDividerProps {
  /** Fill color of the wave (the color of the section it flows INTO). */
  fill: string;
  /** Flip vertically so the crest points up instead of down. */
  flip?: boolean;
  className?: string;
}

/**
 * Recurring brand motif: a soft wave that bridges color transitions between
 * sections (a friendly, "fresh" cue for a cleaning brand). Used deliberately at
 * band boundaries, not as a one-off flourish. Decorative, so hidden from a11y.
 */
export default function WaveDivider({ fill, flip = false, className = "" }: WaveDividerProps) {
  return (
    <div
      aria-hidden="true"
      className={`w-full overflow-hidden leading-none ${className}`}
    >
      <svg
        viewBox="0 0 1440 64"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        className="block w-full h-8 sm:h-12"
        style={flip ? { transform: "scaleY(-1)" } : undefined}
      >
        <path d="M0,32 C360,64 1080,0 1440,32 L1440,64 L0,64 Z" fill={fill} />
      </svg>
    </div>
  );
}
