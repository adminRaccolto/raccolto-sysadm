interface StatCardProps {
  label: string;
  value: number | string;
  helper?: string;
}

export default function StatCard({ label, value, helper }: StatCardProps) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <strong className="stat-card__value">{value}</strong>
      {helper ? <small className="stat-card__helper">{helper}</small> : null}
    </div>
  );
}
