import Modal from './Modal'

export default function NoPermissionModal({ info, onClose }) {
  if (!info) return null
  return (
    <Modal open={!!info} onClose={onClose} title={info.title || 'Access Restricted'} size="sm">
      <div style={{ textAlign:'center', padding:'8px 0 12px' }}>
        <div style={{ fontSize:44, marginBottom:12 }}>🔒</div>
        <p style={{ color:'var(--gray-dark)', lineHeight:1.7, fontSize:14 }}>{info.msg}</p>
        <p style={{ fontSize:12, color:'var(--gray-mid)', marginTop:12 }}>
          Contact your <strong>Administrator</strong> to perform this action.
        </p>
      </div>
      <div className="modal-actions">
        <button className="btn btn-primary" style={{ width:'100%' }} onClick={onClose}>Got it</button>
      </div>
    </Modal>
  )
}
