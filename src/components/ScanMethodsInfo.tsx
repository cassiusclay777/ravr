import React from 'react';
import styled from 'styled-components';
import { MobileMediaScanner } from '../audio/MobileMediaScanner';

const InfoContainer = styled.div`
  background: rgba(79, 70, 229, 0.1);
  border: 1px solid rgba(79, 70, 229, 0.3);
  border-radius: 6px;
  padding: 1rem;
  margin: 1rem 0;
`;

const InfoTitle = styled.h4`
  margin: 0 0 0.5rem 0;
  color: #a5b4fc;
  font-size: 0.95rem;
`;

const InfoText = styled.p`
  margin: 0.5rem 0;
  color: #cbd5e1;
  font-size: 0.9rem;
  line-height: 1.4;
`;

const MethodList = styled.ul`
  margin: 0.5rem 0;
  padding-left: 1.5rem;
  color: #cbd5e1;
  font-size: 0.85rem;
  
  li {
    margin: 0.25rem 0;
  }
  
  .supported { color: #4ade80; }
  .not-supported { color: #f87171; }
`;

const DeviceInfo = styled.div`
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  padding: 0.75rem;
  margin-top: 0.75rem;
  font-size: 0.85rem;
  
  .device-type {
    color: #fbbf24;
    font-weight: 500;
  }
  
  .capabilities {
    color: #cbd5e1;
    margin-top: 0.25rem;
  }
`;

export const ScanMethodsInfo: React.FC = () => {
  const isMobile = MobileMediaScanner.isMobileDevice();
  const supportedMethods = MobileMediaScanner.getRecommendedScanMethods();

  const getMethodName = (method: string): string => {
    switch (method) {
      case 'directory': return 'Výběr celé složky';
      case 'files': return 'Výběr více souborů';
      case 'input': return 'Základní výběr souborů';
      case 'mobile-optimized': return 'Mobilní optimalizace';
      default: return method;
    }
  };

  const isMethodSupported = (method: string): boolean => {
    switch (method) {
      case 'directory': return 'showDirectoryPicker' in window;
      case 'files': return 'showOpenFilePicker' in window;
      case 'input': return true;
      case 'mobile-optimized': return isMobile;
      default: return false;
    }
  };

  return (
    <InfoContainer>
      <InfoTitle>💡 Informace o skenování</InfoTitle>
      
      <InfoText>
        Vyberte si nejvhodnější metodu podle vašeho zařízení a potřeb:
      </InfoText>
      
      <MethodList>
        <li className="supported">
          <strong>Jeden soubor:</strong> Rychlé testování jednotlivých skladeb
        </li>
        <li className={isMethodSupported('files') ? 'supported' : 'not-supported'}>
          <strong>Více souborů:</strong> Vyberte více skladeb najednou 
          {!isMethodSupported('files') && ' (není podporováno)'}
        </li>
        <li className={isMethodSupported('directory') ? 'supported' : 'not-supported'}>
          <strong>Celou složku:</strong> Naskenuje všechny audio soubory ve složce včetně podsložek 
          {!isMethodSupported('directory') && ' (není podporováno)'}
        </li>
        <li className="not-supported">
          <strong>Najít vše 🚀:</strong> Experimentální funkce pro automatické nalezení hudby
        </li>
      </MethodList>
      
      <DeviceInfo>
        <div className="device-type">
          {isMobile ? '📱 Mobilní zařízení' : '💻 Počítač'} detekováno
        </div>
        <div className="capabilities">
          Podporované metody: {supportedMethods.map(getMethodName).join(', ')}
        </div>
      </DeviceInfo>
      
      {isMobile && (
        <InfoText>
          <strong>Tip pro mobil:</strong> Použijte "Více souborů" pro rychlý výběr z galerie nebo složky Downloads.
        </InfoText>
      )}
    </InfoContainer>
  );
};
