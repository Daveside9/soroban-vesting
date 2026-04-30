import React from 'react';
import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { WalletButton } from './components/WalletButton';
import { Dashboard } from './pages/Dashboard';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        {/* Navigation */}
        <header className="navbar">
          <div className="navbar__brand">
            <span className="navbar__logo">🔒</span>
            <span className="navbar__title">Soroban Vesting</span>
          </div>
          <nav className="navbar__links">
            <NavLink to="/" end className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Dashboard
            </NavLink>
            <NavLink to="/docs" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
              Docs
            </NavLink>
          </nav>
          <WalletButton />
        </header>

        {/* Main content */}
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route
              path="/docs"
              element={
                <div className="docs-page">
                  <h1>Documentation</h1>
                  <p>
                    See the full documentation in the{' '}
                    <a
                      href="https://github.com/Daveside9/soroban-vesting"
                      target="_blank"
                      rel="noreferrer"
                    >
                      GitHub repository
                    </a>
                    .
                  </p>
                </div>
              }
            />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="footer">
          <p>
            Built on{' '}
            <a href="https://stellar.org" target="_blank" rel="noreferrer">
              Stellar
            </a>{' '}
            ·{' '}
            <a href="https://www.drips.network/wave/stellar" target="_blank" rel="noreferrer">
              Stellar Wave Program
            </a>
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
}
