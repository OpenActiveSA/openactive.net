'use client';

import { useState } from 'react';
import Link from 'next/link';

export function BurgerMenu() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div style={{ position: 'fixed', top: '1rem', right: '1rem', zIndex: 1000 }}>
      {/* Burger Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '0.5rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.25rem',
          zIndex: 1001,
        }}
        aria-label="Toggle menu"
      >
        <div
          style={{
            width: '24px',
            height: '3px',
            backgroundColor: '#ffffff',
            borderRadius: '2px',
            transition: 'all 0.3s ease',
            transform: isOpen ? 'rotate(45deg) translate(5px, 5px)' : 'none',
          }}
        />
        <div
          style={{
            width: '24px',
            height: '3px',
            backgroundColor: '#ffffff',
            borderRadius: '2px',
            transition: 'all 0.3s ease',
            opacity: isOpen ? 0 : 1,
          }}
        />
        <div
          style={{
            width: '24px',
            height: '3px',
            backgroundColor: '#ffffff',
            borderRadius: '2px',
            transition: 'all 0.3s ease',
            transform: isOpen ? 'rotate(-45deg) translate(7px, -6px)' : 'none',
          }}
        />
      </button>

      {/* Menu Overlay */}
      {isOpen && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999,
            }}
            onClick={() => setIsOpen(false)}
          />
          <nav
            style={{
              position: 'absolute',
              top: '3rem',
              right: 0,
              backgroundColor: '#ffffff',
              border: '1px solid #e5e5e5',
              borderRadius: '0.5rem',
              boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
              minWidth: '200px',
              padding: '0.5rem 0',
              zIndex: 1001,
            }}
          >
            <Link
              href="/login"
              onClick={() => setIsOpen(false)}
              style={{
                display: 'block',
                padding: '0.75rem 1.5rem',
                color: '#000000',
                textDecoration: 'none',
                fontSize: '1rem',
                transition: 'background-color 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f5f5f5';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Login
            </Link>
          </nav>
        </>
      )}
    </div>
  );
}

