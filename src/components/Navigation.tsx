import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import styled from 'styled-components';

const NavContainer = styled.nav`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
  
  @media (max-width: 640px) {
    flex-direction: column;
    align-items: flex-start;
    width: 100%;
  }
`;

const NavList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  
  @media (max-width: 640px) {
    width: 100%;
    padding-top: 0.5rem;
    overflow-x: auto;
    justify-content: space-between;
  }
`;

const StyledLink = styled(NavLink)`
  padding: 0.4rem 0.75rem;
  border-radius: 4px;
  color: rgba(255, 255, 255, 0.8);
  text-decoration: none;
  transition: all 0.2s;
  position: relative;
  
  &:hover {
    color: white;
    background: rgba(255, 255, 255, 0.1);
  }
  
  &.active {
    color: white;
    font-weight: 600;
    
    &:after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0.5rem;
      right: 0.5rem;
      height: 2px;
      background: linear-gradient(to right, #4f46e5, #06b6d4);
      border-radius: 1px;
    }
  }
  
  @media (max-width: 640px) {
    padding: 0.5rem;
    font-size: 0.9rem;
    flex: 1;
    text-align: center;
  }
`;

const BackButton = styled.button`
  display: flex;
  align-items: center;
  padding: 0.4rem 0.75rem;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s;
  
  &:hover {
    background: rgba(255, 255, 255, 0.2);
  }
  
  svg {
    width: 16px;
    height: 16px;
    margin-right: 4px;
  }
  
  @media (max-width: 640px) {
    width: 100%;
    justify-content: center;
    margin-bottom: 0.5rem;
  }
`;

const MobileMenuButton = styled.button<{ $isOpen: boolean }>`
  display: none;
  padding: 0.5rem;
  background: none;
  border: none;
  color: white;
  cursor: pointer;
  
  @media (max-width: 640px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    
    svg {
      width: 20px;
      height: 20px;
      transition: transform 0.2s;
      transform: ${props => props.$isOpen ? 'rotate(180deg)' : 'rotate(0)'};
    }
  }
`;

const MobileMenu = styled.div<{ $isOpen: boolean }>`
  display: flex;
  
  @media (max-width: 640px) {
    display: ${props => props.$isOpen ? 'flex' : 'none'};
    flex-direction: column;
    width: 100%;
  }
`;

export const Navigation: React.FC = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  
  const handleBack = () => {
    navigate(-1);
  };
  
  const toggleMenu = () => {
    setIsMenuOpen(prev => !prev);
  };
  
  // Zavřít menu po kliknutí na odkaz
  const handleNavClick = () => {
    setIsMenuOpen(false);
  };
  
  return (
    <NavContainer>
      <BackButton onClick={handleBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        Zpět
      </BackButton>
      
      <MobileMenuButton $isOpen={isMenuOpen} onClick={toggleMenu}>
        Menu
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
        </svg>
      </MobileMenuButton>
      
      <MobileMenu $isOpen={isMenuOpen}>
        <NavList>
          <StyledLink to="/" onClick={handleNavClick}>Player</StyledLink>
          <StyledLink to="/dsp" onClick={handleNavClick}>DSP</StyledLink>
          <StyledLink to="/tracks" onClick={handleNavClick}>Auto Tracks</StyledLink>
          <StyledLink to="/settings" onClick={handleNavClick}>Settings</StyledLink>
        </NavList>
      </MobileMenu>
    </NavContainer>
  );
};
