import { NavLink } from 'react-router-dom'

import { tabs } from '../../data/mobileData'

export default function BottomTabBar() {
  return (
    <nav className="bottom-tabs" aria-label="Primary">
      {tabs.map((tab) => (
        <NavLink
          key={tab.key}
          to={tab.path}
          className={({ isActive }) =>
            isActive ? 'tab-link tab-link-active' : 'tab-link'
          }
        >
          <span className="tab-icon" aria-hidden="true">
            {tab.icon}
          </span>
          <span>{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  )
}
