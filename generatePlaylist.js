// 📁 Skript pro generování playlist.json ze složky /public/audio

const fs = require('fs');
const path = require('path');

const audioDir = path.join(__dirname, 'public/audio');
const output = path.join(audioDir, 'playlist.json');

try {
  const files = fs
    .readdirSync(audioDir)
    .filter((f) => /\.(mp3|wav)$/i.test(f) && !f.startsWith('.'));

  if (files.length === 0) {
    console.warn('⚠️ Ve složce /audio nejsou žádné .mp3 nebo .wav soubory.');
    return;
  }

  const playlist = files.map((file) => {
    const cleanName = file
      .replace(/\.(mp3|wav)$/i, '')
      .replace(/_/g, ' ')
      .replace(/%20/g, ' ')
      .replace(/-/g, ' ')
      .trim();

    return {
      name: cleanName,
      file: `/audio/${encodeURIComponent(file)}`
    };
  });

  fs.writeFileSync(output, JSON.stringify(playlist, null, 2));
  console.log(`✅ playlist.json byl vytvořen: ${output}`);
} catch (err) {
  console.error('❌ Chyba při generování playlist.json:', err.message);
}