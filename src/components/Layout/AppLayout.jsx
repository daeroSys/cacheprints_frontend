import Sidebar from './Sidebar'
import Header from './Header'
import './AppLayout.css'

export default function AppLayout({ children, activePage, onNav, lowStockCount, criticalStockCount }) {
  return (
    <div className="app-layout">
      <Sidebar active={activePage} onNav={onNav} lowStockCount={lowStockCount + criticalStockCount} />
      <div className="app-layout__main">
        <Header activePage={activePage} lowStockCount={lowStockCount} criticalStockCount={criticalStockCount} onNav={onNav} />
        <main className="app-layout__content">
          {children}
        </main>
      </div>
    </div>
  )
}
