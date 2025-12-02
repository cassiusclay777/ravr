# Úkol: Upgraduj RAVR audio engine na úroveň světových audio aplikací (Neutron Player, USB Audio Pro) & integruj tančící postavu do rytmu hudby

## Cíle
- Implementuj následující upgrady dle níže uvedených bodů, používej pouze open-source knihovny, vše v TypeScript/React/Web Audio API.
- UX zachovej v minimal Android stylu, viz původní design.

### Funkce

1. **Bit-perfect Hi-Res Audio (32bit/384kHz, FLAC, DSD, WAV, AIFF), přímý výstup na USB DAC**
   - Obcházet OS audio stack, využít dostupné technologie pro čistý přenos na DAC.
   - Přidat režim "Bit-perfect" do nastavení.

2. **Advanced DSP Chain:**
   - 4-60 pásmový parametrický EQ (volba typu/frekvence/Q/gain).
   - Convolution reverb (impulse response soubory, user upload).
   - Kompresor (attack/release/ratio/thresh), limiter.
   - Surround/crossfeed pro sluchátka.

3. **Network Streaming:**
   - Podpora SMB, SFTP, FTP, UPnP/DLNA, Chromecast.
   - Zobrazení informací o serveru/zdroji v UI.

4. **AI Funkce:**
   - AI generování playlistů/soundprofilů (plugin na volbě, ideálně open-source AI queue/EQ).
   - Lyrics detection/transcription (Whisper+source separation).

5. **Pokročilá vizualizace:**
   - 3D audio-reactive vizualizace (Three.js particle grid, ProjectM).
   - Tančící postava synchronizovaná s BPM/beaty – asset z Mixamo/Sketchfab, animace napojená na FFT/BPM analysis.
   - Možnost animace volit v nastavení (vyp/zap, experimentální).

6. **Export presetů a sdílení:**
   - Export všech DSP/FX presetů do .json/.md souboru (+ import přes QR nebo cloud).
   - Sdílení uživatelských presetů přes komunitní sekci.

7. **Spatial/Binaural Audio:**
   - Binaural rendering s Binamix nebo obdobnou knihovnou.

### Open-source knihovny
- ProjectM, gl-react, react-three-fiber, lottie-web, ShaderPark, Binamix, Whisper, Sonic Visualiser, Web Audio API, Three.js.

### Další požadavky
- Zachovej minimalistické ovládání a theme.
- Kód rozdělit do modulů (DSPEffects, Visualizer, AI, Streaming, BitPerfect, Presets).
- Popisuj klíčové funkce v komentářích.
- Ukázku hotové vizualizace – implementuj demo screen s particle vizualizací a tančící postavou (dummy animace).

## Dokumentace a reference
- Přilož README s popisem upgradů, použij markdown.

---

Napoj se na existující repo: [https://github.com/cassiusclay777/ravr](https://github.com/cassiusclay777/ravr) – funkce/presets/mody integruj v samostatných modulech, vše jako PR či draft branch.
