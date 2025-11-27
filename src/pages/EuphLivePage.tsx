/**
 * 🎵 EUPH Live Processor Page
 * Real-time audio enhancement - upload any format, hear EUPH magic instantly!
 */

import React from 'react';
import EuphLiveProcessor from '../components/EuphLiveProcessor';

export function EuphLivePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 py-8">
      <EuphLiveProcessor />
    </div>
  );
}

export default EuphLivePage;
