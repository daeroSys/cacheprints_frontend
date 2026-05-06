import './Badge.css'

export default function Badge({ status, children }) {
  return (
    <span className={`badge badge--${status}`}>
      {children}
    </span>
  )
}
