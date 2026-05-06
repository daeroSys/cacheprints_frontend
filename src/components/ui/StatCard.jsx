import './StatCard.css'

export default function StatCard({ label, value, sub, icon, accent, delay = 0 }) {
  return (
    <div className="stat-card animate-fade-up" style={{ animationDelay: `${delay}ms` }}>
      {icon && (
        <div className="stat-card__icon" style={accent ? { background: accent } : {}}>
          {icon}
        </div>
      )}
      <div className="stat-card__body">
        <p className="stat-card__label">{label}</p>
        <p className="stat-card__value">{value}</p>
        {sub && <p className="stat-card__sub">{sub}</p>}
      </div>
    </div>
  )
}
