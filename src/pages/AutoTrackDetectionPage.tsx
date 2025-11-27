import React from 'react';
import { AudioFileUploader } from '../components/AudioFileUploader';
import styled from 'styled-components';

const PageContainer = styled.div`
  padding: 20px;
  max-width: 1000px;
  margin: 0 auto;
`;

const PageTitle = styled.h2`
  color: #fff;
  margin-bottom: 20px;
`;

const PageDescription = styled.p`
  color: #ccc;
  margin-bottom: 20px;
`;

const AutoTrackDetectionPage: React.FC = () => {
  return (
    <PageContainer>
      <PageTitle>Automatická detekce audio stop</PageTitle>
      <PageDescription>
        Nahrajte audio soubor a systém automaticky detekuje stopy a jejich metadata.
        Podporuje širokou škálu formátů včetně MP3, FLAC, WAV, OGG a mnoho dalších.
      </PageDescription>
      
      <AudioFileUploader />
      
    </PageContainer>
  );
};

export default AutoTrackDetectionPage;
