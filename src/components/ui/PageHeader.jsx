import './PageHeader.css'

export default function PageHeader({ title, subtitle, action }) {
  return (
    <div className="page-header animate-fade-up">
      <div>
        <h1 className="page-header__title">{title}</h1>
        {subtitle && <p className="page-header__sub">{subtitle}</p>}
      </div>
      {action && <div className="page-header__action">{action}</div>}
    </div>
  )
}
