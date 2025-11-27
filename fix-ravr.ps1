# fix-ravr.ps1  (spouštět v kořeni projektu)
$ErrorActionPreference = "Stop"

# 1) Složky
New-Item -Force -ItemType Directory -Path .\src, .\src\components, .\src\pages, .\src\hooks, .\src\utils, .\public | Out-Null

# 2) Přesuny, pokud existují v kořeni
@("App.tsx","main.tsx","index.css","index.html") | ForEach-Object {
  if (Test-Path ".\$_") { Move-Item -Force ".\$_" ".\src\$_" -ErrorAction SilentlyContinue }
}

# index.html patří do kořene – vrátíme ho zpět z /src (pokud jsme ho přesunuli)
if (Test-Path .\src\index.html) { Move-Item -Force .\src\index.html .\index.html }

# 3) Základní soubory (přepíšou/ vytvoří)
Set-Content -NoNewline -Encoding UTF8 -Path .\tailwind.config.js -Value @'
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        ravr: {
          bg: "#0b0f14",
          panel: "#111827",
          accent: "#00ffc6",
          glow: "#37ffd2"
        }
      }
    }
  },
  plugins: [],
}
'@

Set-Content -NoNewline -Encoding UTF8 -Path .\postcss.config.js -Value @'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
'@

# Vite config (TS)
Set-Content -NoNewline -Encoding UTF8 -Path .\vite.config.ts -Value @'
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") }
  },
  optimizeDeps: {
    include: ["clsx", "tailwind-merge"]
  }
});
'@

# tsconfig
Set-Content -NoNewline -Encoding UTF8 -Path .\tsconfig.json -Value @'
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "moduleResolution": "Bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "allowSyntheticDefaultImports": true,
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] },
    "strict": false
  },
  "include": ["src", "vite-env.d.ts"]
}
'@

# index.html (kořen)
Set-Content -NoNewline -Encoding UTF8 -Path .\index.html -Value @'
<!doctype html>
<html lang="cs">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>RAVR</title>
  </head>
  <body class="bg-ravr-bg text-white">
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
'@

# src/main.tsx
Set-Content -NoNewline -Encoding UTF8 -Path .\src\main.tsx -Value @'
import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
'@

# src/index.css
Set-Content -NoNewline -Encoding UTF8 -Path .\src\index.css -Value @'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  color-scheme: dark;
}
'@

# src/App.tsx
Set-Content -NoNewline -Encoding UTF8 -Path .\src\App.tsx -Value @'
import React from "react";
import { Layout } from "@/components/Layout";
import { NowPlaying } from "@/components/NowPlaying";
import { DspQuick } from "@/components/DspQuick";

export default function App() {
  return (
    <Layout>
      <div className="grid gap-6 md:grid-cols-2">
        <NowPlaying />
        <DspQuick />
      </div>
    </Layout>
  );
}
'@

# src/components/Layout.tsx
Set-Content -NoNewline -Encoding UTF8 -Path .\src\components\Layout.tsx -Value @'
import React from "react";
import { clsx } from "clsx";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-[#0b0f14] to-[#0a0d12]">
      <header className="sticky top-0 z-20 backdrop-blur bg-black/30 border-b border-white/10">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <h1 className="text-xl font-semibold tracking-wide">
            <span className="text-ravr-accent">RAVR</span> Player
          </h1>
          <nav className="flex gap-3 text-sm opacity-80">
            <a className="hover:text-ravr-accent transition" href="#">Player</a>
            <a className="hover:text-ravr-accent transition" href="#">DSP</a>
            <a className="hover:text-ravr-accent transition" href="#">Settings</a>
          </nav>
        </div>
      </header>
      <main className={clsx("mx-auto max-w-6xl px-4 py-8")}>{children}</main>
      <footer className="mt-12 py-6 text-center text-xs text-white/50">
        RAVR · industrial techno engine
      </footer>
    </div>
  );
}
'@

# src/components/NowPlaying.tsx
Set-Content -NoNewline -Encoding UTF8 -Path .\src\components\NowPlaying.tsx -Value @'
import React from "react";
import { useAudioEngine } from "@/hooks/useAudioEngine";

export function NowPlaying() {
  const {
    loadFile, toggle, isPlaying, currentTime, duration, setVolume, volume
  } = useAudioEngine();

  return (
    <section className="rounded-2xl bg-ravr-panel/70 border border-white/10 p-5 shadow-xl">
      <h2 className="text-lg font-semibold mb-4">Now Playing</h2>

      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="rounded-full px-4 py-2 bg-white/10 hover:bg-white/20 transition"
        >
          {isPlaying ? "Pause" : "Play"}
        </button>

        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={(e)=>setVolume(parseFloat(e.target.value))}
          className="w-40"
        />

        <div className="text-xs opacity-70">
          {format(currentTime)} / {format(duration)}
        </div>

        <input type="file" accept="audio/*"
          onChange={(e)=> e.target.files?.[0] && loadFile(e.target.files[0])}
          className="ml-auto text-xs"
        />
      </div>
    </section>
  );
}

function format(s:number){
  if(!isFinite(s)) return "0:00";
  const m = Math.floor(s/60);
  const r = Math.floor(s%60).toString().padStart(2,"0");
  return `${m}:${r}`;
}
'@

# src/components/DspQuick.tsx  (3-pásmový EQ + gain/comp scaffolding)
Set-Content -NoNewline -Encoding UTF8 -Path .\src\components\DspQuick.tsx -Value @'
import React from "react";
import { useAudioEngine } from "@/hooks/useAudioEngine";

export function DspQuick() {
  const { eq, setEq, makeup, setMakeup, comp, setComp } = useAudioEngine();

  return (
    <section className="rounded-2xl bg-ravr-panel/70 border border-white/10 p-5 shadow-xl">
      <h2 className="text-lg font-semibold mb-4">DSP · Quick</h2>

      <div className="grid md:grid-cols-3 gap-4">
        {(["low","mid","high"] as const).map((band)=>(
          <div key={band} className="p-3 rounded-xl bg-black/20">
            <div className="text-sm mb-2 uppercase tracking-wide opacity-80">{band}</div>
            <input type="range" min={-12} max={12} step={0.5}
              value={eq[band]} onChange={e=>setEq(band, Number(e.target.value))}
              className="w-full" />
            <div className="text-xs mt-1 opacity-70">{eq[band]} dB</div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-4">
        <div className="p-3 rounded-xl bg-black/20">
          <div className="text-sm mb-2 uppercase tracking-wide opacity-80">Makeup</div>
          <input type="range" min={-12} max={12} step={0.5}
            value={makeup} onChange={e=>setMakeup(Number(e.target.value))}
            className="w-full" />
          <div className="text-xs mt-1 opacity-70">{makeup} dB</div>
        </div>

        <div className="p-3 rounded-xl bg-black/20">
          <div className="text-sm mb-2 uppercase tracking-wide opacity-80">Compressor (threshold)</div>
          <input type="range" min={-60} max={0} step={1}
            value={comp.threshold} onChange={e=>setComp({threshold:Number(e.target.value)})}
            className="w-full" />
          <div className="text-xs mt-1 opacity-70">{comp.threshold} dB</div>
        </div>
      </div>
    </section>
  );
}
'@

# src/hooks/useAudioEngine.ts  (Web Audio API scaffold – funguje hned)
Set-Content -NoNewline -Encoding UTF8 -Path .\src\hooks\useAudioEngine.ts -Value @'
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type Eq = { low:number; mid:number; high:number };
type Comp = { threshold:number };

export function useAudioEngine(){
  const audio = useRef<HTMLAudioElement|null>(null);
  const ctx = useRef<AudioContext|null>(null);
  const src = useRef<MediaElementAudioSourceNode|null>(null);

  const low = useRef<BiquadFilterNode|null>(null);
  const mid = useRef<BiquadFilterNode|null>(null);
  const high = useRef<BiquadFilterNode|null>(null);
  const comp = useRef<DynamicsCompressorNode|null>(null);
  const gain = useRef<GainNode|null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrent] = useState(0);
  const [volume, setVol] = useState(0.9);
  const [eq, setEqState] = useState<Eq>({ low:0, mid:0, high:0 });
  const [makeup, setMakeup] = useState(0);
  const [compState, setCompState] = useState<Comp>({ threshold: -24 });

  // init graph
  useEffect(()=>{
    audio.current = new Audio();
    audio.current.crossOrigin = "anonymous";
    audio.current.preload = "metadata";
    audio.current.addEventListener("timeupdate", ()=> setCurrent(audio.current!.currentTime));
    audio.current.addEventListener("loadedmetadata", ()=> setDuration(audio.current!.duration));

    ctx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    src.current = ctx.current.createMediaElementSource(audio.current);

    // nodes
    low.current = ctx.current.createBiquadFilter(); low.current.type = "lowshelf";  low.current.frequency.value = 80;
    mid.current = ctx.current.createBiquadFilter(); mid.current.type = "peaking";   mid.current.frequency.value = 1000; mid.current.Q.value = 0.7;
    high.current= ctx.current.createBiquadFilter(); high.current.type= "highshelf"; high.current.frequency.value = 10000;

    comp.current = ctx.current.createDynamicsCompressor(); comp.current.threshold.value = -24; comp.current.ratio.value = 2;
    gain.current = ctx.current.createGain(); gain.current.gain.value = dbToGain(0);

    // chain: src -> low -> mid -> high -> comp -> gain -> dest
    src.current.connect(low.current);
    low.current.connect(mid.current);
    mid.current.connect(high.current);
    high.current.connect(comp.current);
    comp.current.connect(gain.current);
    gain.current.connect(ctx.current.destination);

    return ()=> { ctx.current?.close(); }
  },[]);

  // controls
  const play = useCallback(async ()=>{
    await ctx.current?.resume();
    await audio.current?.play();
    setIsPlaying(true);
  },[]);
  const pause = useCallback(()=>{
    audio.current?.pause(); setIsPlaying(false);
  },[]);
  const toggle = useCallback(()=> (audio.current?.paused ? play() : pause()), [play,pause]);

  const loadFile = useCallback((file:File)=>{
    const url = URL.createObjectURL(file);
    if(!audio.current) return;
    audio.current.src = url;
    audio.current.currentTime = 0;
  },[]);

  // volume
  useEffect(()=>{ if(audio.current) audio.current.volume = volume; },[volume]);

  // EQ
  const setEq = useCallback((band: keyof Eq, value:number)=>{
    setEqState(prev => ({...prev, [band]: value}));
  },[]);
  useEffect(()=>{
    if(!low.current || !mid.current || !high.current) return;
    low.current.gain.value = eq.low;
    mid.current.gain.value = eq.mid;
    high.current.gain.value = eq.high;
  }, [eq]);

  // Makeup gain (post comp)
  useEffect(()=>{ if(gain.current) gain.current.gain.value = dbToGain(makeup); },[makeup]);

  // Compressor threshold
  const setComp = useCallback((c: Partial<Comp>)=>{
    setCompState(prev => ({...prev, ...c}));
  },[]);
  useEffect(()=>{ if(comp.current) comp.current.threshold.value = compState.threshold; },[compState.threshold]);

  return {
    // transport
    isPlaying, play, pause, toggle,
    currentTime, duration,
    loadFile,

    // volume
    volume, setVolume: setVol,

    // dsp
    eq, setEq, makeup, setMakeup, comp: compState, setComp,
  };
}

function dbToGain(db:number){ return Math.pow(10, db/20); }
'@

# src/utils/profiles.ts (placeholder, aby nepadaly importy v budoucnu)
Set-Content -NoNewline -Encoding UTF8 -Path .\src\utils\profiles.ts -Value @'
export type DeviceProfile = { id:string; name:string };
export const KNOWN_PROFILES: DeviceProfile[] = [{ id:"default", name:"Default" }];
export const DEFAULT_PROFILE = KNOWN_PROFILES[0];
'@

# 4) package.json – doplníme skripty (pokud už je máš, tohle si jen zkontroluješ)
if (Test-Path .\package.json) {
  Write-Host "package.json already exists. Zkontroluj skripty: dev/build/preview."
} else {
  Set-Content -NoNewline -Encoding UTF8 -Path .\package.json -Value @'
{
  "name": "ravr",
  "private": true,
  "version": "1.3.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  "devDependencies": {
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "typescript": "^5.5.4",
    "vite": "^5.4.3",
    "clsx": "^2.1.1",
    "tailwind-merge": "^2.5.2"
  }
}
'@
}

Write-Host "`n✅ Hotovo. Teď: pnpm i  (nebo npm i)  a pak pnpm dev / npm run dev" -ForegroundColor Green
