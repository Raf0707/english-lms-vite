export function ProgressRing({ value, size = 58 }: { value: number; size?: number }) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const progress = Math.max(0, Math.min(100, value));
  return (
    <div className="progress-ring" style={{ width: size, height: size }} aria-label={`Прогресс ${progress}%`}>
      <svg viewBox="0 0 52 52" aria-hidden="true">
        <circle cx="26" cy="26" r={radius} className="progress-ring__track" />
        <circle
          cx="26"
          cy="26"
          r={radius}
          className="progress-ring__value"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * progress) / 100}
        />
      </svg>
      <strong>{progress}%</strong>
    </div>
  );
}
