import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/simulation', label: 'Live Simulation' },
  { to: '/analytics', label: 'Analytics' }
];

export default function Navbar() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-bg/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-3 md:px-6">
        <div>
          <h1 className="text-sm font-semibold uppercase tracking-[0.18em] text-textSub">AxisX Command Center</h1>
        </div>
        <nav className="flex items-center gap-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `rounded-md px-3 py-2 text-sm transition-colors duration-200 ${
                  isActive ? 'bg-accent text-white' : 'text-textSub hover:bg-panel hover:text-textMain'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </header>
  );
}
