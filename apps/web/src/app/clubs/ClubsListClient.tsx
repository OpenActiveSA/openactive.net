'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { generateSlug } from '@/lib/slug-utils';

interface Club {
  id: string;
  name: string;
  numberOfCourts?: number;
  country?: string;
  province?: string;
  logo?: string;
  backgroundImage?: string;
  backgroundColor?: string;
  address?: string;
  description?: string;
}

interface ClubsListClientProps {
  clubs: Club[];
}

export default function ClubsListClient({ clubs }: ClubsListClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [region, setRegion] = useState('All Regions');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isRegionDropdownOpen, setIsRegionDropdownOpen] = useState(false);

  // Extract unique regions from clubs
  const availableRegions = ['All Regions', ...Array.from(new Set(
    clubs
      .map(club => {
        // Prefer province, fallback to country, or null
        return club.province || club.country || null;
      })
      .filter((region): region is string => region !== null && region.trim() !== '')
      .sort()
  ))];

  // Load favorites from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('favoriteClubs');
    if (saved) {
      try {
        setFavorites(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('[data-region-dropdown]')) {
        setIsRegionDropdownOpen(false);
      }
    };

    if (isRegionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isRegionDropdownOpen]);

  const toggleFavorite = (clubId: string, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    const newFavorites = favorites.includes(clubId)
      ? favorites.filter(id => id !== clubId)
      : [...favorites, clubId];
    
    setFavorites(newFavorites);
    localStorage.setItem('favoriteClubs', JSON.stringify(newFavorites));
  };

  const filteredClubs = clubs
    .filter(club => {
      // Filter by search term
      const matchesSearch = club && club.name && club.name.toLowerCase().includes(searchTerm.toLowerCase());
      
      // Filter by region
      const matchesRegion = region === 'All Regions' || 
        club.province === region || 
        club.country === region;
      
      return matchesSearch && matchesRegion;
    })
    .sort((a, b) => {
      // Sort favorites first
      const aFav = favorites.includes(a.id);
      const bFav = favorites.includes(b.id);
      if (aFav && !bFav) return -1;
      if (!aFav && bFav) return 1;
      return a.name.localeCompare(b.name);
    });

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: '#052333',
      color: '#ffffff',
      fontFamily: 'Poppins, sans-serif'
    }}>
      {/* Header */}
      <header style={{
        padding: '20px',
        position: 'sticky',
        top: 0,
        zIndex: 10,
        backgroundColor: '#052333'
      }}>
        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '15px',
            position: 'relative'
          }}>
            <div
              onClick={() => router.push('/')}
              style={{
                position: 'absolute',
                left: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="17,21 7,12 17,3"></polyline>
              </svg>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              paddingTop: '8px',
              paddingBottom: '8px'
            }}>
              <i className="oa-open-o" style={{ fontSize: '20px', color: '#ffffff', opacity: 1.0, display: 'inline-block' }}></i>
              <i className="oa-open-p" style={{ fontSize: '20px', color: '#ffffff', opacity: 1.0, display: 'inline-block' }}></i>
              <i className="oa-open-e" style={{ fontSize: '20px', color: '#ffffff', opacity: 1.0, display: 'inline-block' }}></i>
              <i className="oa-open-n" style={{ fontSize: '20px', color: '#ffffff', opacity: 1.0, display: 'inline-block' }}></i>
            </div>
          </div>
          
          {/* Region Selector */}
          <div style={{ position: 'relative' }} data-region-dropdown>
            <div
              onClick={() => setIsRegionDropdownOpen(!isRegionDropdownOpen)}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                padding: '12px 15px',
                marginBottom: '10px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              }}
            >
              <span style={{ color: 'white', fontSize: '14px' }}>{region}</span>
              <svg 
                width="16" 
                height="16" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="white" 
                strokeWidth="2" 
                strokeLinecap="round" 
                strokeLinejoin="round"
                style={{
                  transform: isRegionDropdownOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                  transition: 'transform 0.2s'
                }}
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>
            
            {isRegionDropdownOpen && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                background: '#052333',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '4px',
                marginTop: '4px',
                maxHeight: '300px',
                overflowY: 'auto',
                zIndex: 1000,
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)'
              }}>
                {availableRegions.map((reg) => (
                  <div
                    key={reg}
                    onClick={() => {
                      setRegion(reg);
                      setIsRegionDropdownOpen(false);
                    }}
                    style={{
                      padding: '12px 15px',
                      color: 'white',
                      fontSize: '14px',
                      cursor: 'pointer',
                      background: region === reg ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                      transition: 'background 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      if (region !== reg) {
                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (region !== reg) {
                        e.currentTarget.style.background = 'transparent';
                      }
                    }}
                  >
                    {reg}
                  </div>
                ))}
              </div>
            )}
          </div>
          
          {/* Search Box */}
          <div style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center'
          }}>
            <input
              type="text"
              placeholder="Search Club"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '1rem 3rem 1rem 1rem',
                border: 'none',
                borderBottom: '2px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 0,
                fontSize: '1rem',
                fontFamily: 'Poppins, sans-serif',
                background: searchTerm ? 'rgba(255, 255, 255, 0.5)' : 'transparent',
                color: searchTerm ? '#052333' : 'white',
                transition: 'all 0.3s ease',
                boxSizing: 'border-box'
              }}
              onFocus={(e) => {
                e.target.style.borderBottom = '2px solid rgba(255, 255, 255, 0.6)';
              }}
              onBlur={(e) => {
                e.target.style.borderBottom = '2px solid rgba(255, 255, 255, 0.3)';
              }}
            />
            <span style={{
              position: 'absolute',
              right: '1rem',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center'
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={searchTerm ? '#052333' : 'rgba(255, 255, 255, 0.6)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.35-4.35"></path>
              </svg>
            </span>
          </div>
        </div>
      </header>

      {/* Content */}
      <div style={{
        flex: 1,
        padding: '20px',
        overflow: 'auto'
      }}>
        {filteredClubs.length === 0 ? (
          <p style={{ color: 'white', textAlign: 'center' }}>
            {searchTerm ? 'No clubs found.' : 'No clubs available at the moment.'}
          </p>
        ) : (
          <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredClubs.map(club => (
              <Link
                key={club.id}
                href={`/club/${generateSlug(club.name)}`}
                style={{
                  textDecoration: 'none',
                  color: 'inherit'
                }}
              >
                <div
                  style={{
                    cursor: 'pointer',
                    borderRadius: '4px',
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.05)',
                    transition: 'transform 0.2s, box-shadow 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-4px)';
                    e.currentTarget.style.boxShadow = '0 8px 20px rgba(0, 0, 0, 0.3)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Club Image/Logo Area */}
                  <div style={{
                    position: 'relative',
                    height: '200px',
                    background: club.backgroundImage
                      ? `url(${club.backgroundImage}) center/cover`
                      : club.logo
                      ? `url(${club.logo}) center/cover`
                      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    display: 'flex',
                    alignItems: 'flex-end',
                    padding: 0
                  }}>
                    {/* Favorite Heart Icon */}
                    <div
                      onClick={(e) => toggleFavorite(club.id, e)}
                      style={{
                        position: 'absolute',
                        top: '15px',
                        left: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        transition: 'transform 0.2s',
                        zIndex: 2
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill={favorites.includes(club.id) ? '#ff4444' : 'none'}
                        stroke={favorites.includes(club.id) ? '#ff4444' : 'white'}
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                      </svg>
                    </div>
                    
                    {/* Court Count Badge */}
                    <div style={{
                      position: 'absolute',
                      bottom: '15px',
                      right: '15px',
                      background: '#2196F3',
                      borderRadius: '4px',
                      padding: '6px 10px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="12" y1="3" x2="12" y2="21"></line>
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                      </svg>
                      <span style={{ color: 'white', fontSize: '14px', fontWeight: '600' }}>
                        {club.numberOfCourts || 0}
                      </span>
                    </div>
                    
                    {/* Club Name Overlay */}
                    <h3 style={{
                      position: 'absolute',
                      bottom: '15px',
                      left: '15px',
                      color: 'white',
                      fontSize: '22px',
                      fontWeight: '600',
                      margin: 0,
                      textShadow: '0 2px 8px rgba(0, 0, 0, 0.5)',
                      fontFamily: 'Poppins, sans-serif',
                      zIndex: 1
                    }}>
                      {club.name}
                    </h3>
                  </div>
                  
                  {/* Location Info */}
                  <div style={{
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                      <circle cx="12" cy="10" r="3"></circle>
                    </svg>
                    <span style={{ color: 'white', fontSize: '14px', fontFamily: 'Poppins, sans-serif' }}>
                      {club.address || club.description || [club.province, club.country].filter(Boolean).join(', ') || 'Location not specified'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

