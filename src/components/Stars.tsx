export default function Stars({ value, className = "text-base" }: { value: number; className?: string }) {
  const full = Math.max(0, Math.min(5, Math.round(value)));
  return (
    <span className={`${className} tracking-tight text-amber-400`} aria-label={`${value.toFixed(1)} out of 5 stars`}>
      {"★".repeat(full)}
      <span className="text-gray-300">{"★".repeat(5 - full)}</span>
    </span>
  );
}
