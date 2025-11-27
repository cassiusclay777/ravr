import { FC } from 'react';

const AboutPage: FC = () => {
  return (
    <div className="text-white">
      <h1 className="text-4xl font-bold mb-6">About RAVR</h1>
      <div className="bg-black/50 p-6 rounded-lg backdrop-blur-sm max-w-3xl">
        <p className="mb-4 text-lg">
          RAVR is a futuristic audio player with advanced DSP capabilities, designed for audiophiles and music producers.
        </p>
        <p className="text-cyan-400">
          Experience your music like never before with our cutting-edge audio processing and visualization.
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
