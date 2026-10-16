import { useState } from 'react'
import Icon from './Icon.jsx'

const modules = ['UM', 'SALE', 'PM', 'Planning']

export default function Navbar({ onMenuToggle, onLogout, onOpenLotteryOperations }) {
  const [openMenu, setOpenMenu] = useState('')
  const [activeModule, setActiveModule] = useState('PM')
  const [moduleNotice, setModuleNotice] = useState('')

  const chooseModule = (module) => {
    setOpenMenu('')
    if (module === 'PM') {
      setActiveModule(module)
      setModuleNotice('')
      return
    }
    setModuleNotice(`${module} is a module placeholder and is not available in this prototype.`)
  }

  return (
    <header className="pm-navbar">
      <div className="pm-navbar-brand">
        <button className="pm-icon-button pm-hamburger" type="button" onClick={onMenuToggle} aria-label="Toggle sidebar">
          <Icon name="menu" size={20} />
        </button>
        <span className="pm-brand-emblem" aria-hidden="true"><Icon name="landmark" size={20} /></span>
        <span className="pm-brand-text"><strong>Property Management</strong><small>LUCKNOW DEVELOPMENT AUTHORITY</small></span>
      </div>

      <div className="pm-navbar-actions">
        <div className="pm-popover-wrap">
          <button className={`pm-module-switch${openMenu === 'modules' ? ' is-open' : ''}`} type="button" aria-label="Switch modules" aria-expanded={openMenu === 'modules'} onClick={() => setOpenMenu(openMenu === 'modules' ? '' : 'modules')}>
            <Icon name="grid" size={16} /><span>Modules</span><Icon name="arrowDown" size={13} />
          </button>
          {openMenu === 'modules' && (
            <div className="pm-popover pm-module-popover">
              <span className="pm-popover-label">SWITCH MODULE</span>
              <div className="pm-module-options">
                {modules.map((module) => (
                  <button className={activeModule === module ? 'is-current' : ''} key={module} type="button" onClick={() => chooseModule(module)}>
                    <span className="pm-module-option-icon"><Icon name={module === 'PM' ? 'building' : module === 'Planning' ? 'map' : module === 'SALE' ? 'tag' : 'grid'} size={15} /></span>
                    <span>{module === 'PM' ? 'Property Management' : module === 'UM' ? 'User Management' : module}</span>
                    {activeModule === module && <span className="pm-module-current">Current</span>}
                  </button>
                ))}
              </div>
              <button className="pm-lottery-module" type="button" onClick={() => {
                setOpenMenu('')
                onOpenLotteryOperations()
              }}>Open Lottery Operations <Icon name="arrowUpRight" size={14} /></button>
            </div>
          )}
        </div>
        <div className="pm-popover-wrap">
          <button className="pm-icon-button pm-notification-button" type="button" aria-label="Notifications: 3 unread" aria-expanded={openMenu === 'notifications'} onClick={() => setOpenMenu(openMenu === 'notifications' ? '' : 'notifications')}>
            <Icon name="bell" size={19} /><span className="pm-notification-count">3</span>
          </button>
          {openMenu === 'notifications' && (
            <div className="pm-popover pm-notification-popover">
              <div className="pm-notification-heading"><strong>Notifications</strong><span>3 new</span></div>
              <div className="pm-notification-item"><i className="notice-amber" /><span><strong>32 cases beyond SLA</strong><small>Review pending cases requiring attention</small></span><time>Now</time></div>
              <div className="pm-notification-item"><i className="notice-blue" /><span><strong>Monthly recovery report ready</strong><small>September 2026 summary is available</small></span><time>1h</time></div>
              <div className="pm-notification-item"><i className="notice-green" /><span><strong>New registry applications</strong><small>6 applications received today</small></span><time>3h</time></div>
            </div>
          )}
        </div>
        <div className="pm-profile-wrap">
          <button className="pm-profile-button" type="button" aria-expanded={openMenu === 'profile'} onClick={() => setOpenMenu(openMenu === 'profile' ? '' : 'profile')}>
            <span className="pm-avatar">AK</span>
            <span className="pm-profile-copy"><strong>Arun Kumar</strong><small>Administrator</small></span>
            <Icon name="arrowDown" size={13} />
          </button>
          {openMenu === 'profile' && (
            <div className="pm-popover pm-profile-popover">
              <div className="pm-profile-popover-user"><span className="pm-avatar">AK</span><span><strong>Arun Kumar</strong><small>Administrator · LDA</small></span></div>
              <button type="button" onClick={onLogout}><Icon name="logout" size={16} /> Sign out</button>
            </div>
          )}
        </div>
      </div>
      {moduleNotice && (
        <div className="pm-module-notice" role="status">
          <span>{moduleNotice}</span>
          <button type="button" aria-label="Dismiss module notice" onClick={() => setModuleNotice('')}><Icon name="close" size={14} /></button>
        </div>
      )}
    </header>
  )
}
