'use client'

import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Play, Pause, Volume2, VolumeX, SkipBack, SkipForward } from "lucide-react";

/**
 * BUENA ONDA — THE ARCHIVE
 * Self-hosted radio player. No SoundCloud subscription, no upload limit.
 *
 * WIRING TO YOUR STACK:
 *  - Replace the EPISODES array with rows from your Supabase `episodes` table.
 *  - `audioUrl` points at your Cloudflare R2 `radioarchive` bucket (episodes/ prefix).
 *    Public R2 URLs serve at zero egress. The four URLs below are CORS-free demo
 *    files only so playback works in this preview — swap them for your episode URLs.
 *  - Waveforms are generated deterministically from each episode id (stylized, not
 *    real peaks). That means no pre-render build step. If you ever want true
 *    SoundCloud-style peaks, that's a separate add-on later (audiowaveform → JSON).
 */

const C = {
  ink: "#0E0E0D",
  panel: "#161413",
  panelHi: "#1C1A18",
  line: "rgba(248,247,243,0.08)",
  cream: "#F8F7F3",
  creamDim: "rgba(248,247,243,0.52)",
  creamFaint: "rgba(248,247,243,0.16)",
  teal: "#1A9E9E",
  pink: "#E8176A",
  coral: "#C46D63",
  cyan: "#08CCFC",
};

const F = {
  display: "'Bebas Neue', Impact, sans-serif",
  head: "'Archivo', system-ui, sans-serif",
  mono: "'Space Mono', ui-monospace, monospace",
  serif: "'Fraunces', Georgia, serif",
};

export type ArchiveEpisode = {
  id: string
  no: string
  title: string
  date: string
  duration: string
  desc: string
  audioUrl: string
}

type ArchiveProps = {
  episodes: ArchiveEpisode[]
}

const DEMO_EPISODES: ArchiveEpisode[] = [
  {
    id: "ep01",
    no: "01",
    title: "The 1983 Transition",
    date: "Jun 4, 2026",
    duration: "59:53",
    // Placeholder copy — replace with your own. (No invented credits.)
    desc:
      "Disco loosening its grip and the synthetic future arriving in its place. Two hours tracing the year the machines started keeping time.",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: "ep02",
    no: "02",
    title: "Italo, After Midnight",
    date: "Jun 11, 2026",
    duration: "62:14",
    desc:
      "Arpeggios, vocoders, and the long Mediterranean night. Synth-driven dance music from the European underground.",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3",
  },
  {
    id: "ep03",
    no: "03",
    title: "Balearic Hour",
    date: "Jun 18, 2026",
    duration: "55:39",
    desc:
      "Sunset tempo. Warm, unhurried selections for the slow part of the evening, front to back.",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
  {
    id: "ep04",
    no: "04",
    title: "Field Recordings, Vol. 1",
    date: "Jun 25, 2026",
    duration: "48:02",
    desc:
      "Room tone, tape hiss, and the sound of a city between songs. A quieter dispatch from the archive.",
    audioUrl: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  },
];

/* ---------- deterministic helpers ---------- */
type CoverShape = {
  kind: "tri" | "dot" | "sq" | "ring"
  x: number
  y: number
  s: number
  rot: number
  color: string
}

function seeded(seedStr: string) {
  let h = 2166136261;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  let s = h >>> 0;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967295;
  };
}

function makeWaveform(seedStr: string, n = 150) {
  const rnd = seeded(seedStr);
  const bars = [];
  for (let i = 0; i < n; i++) {
    const env = Math.sin((i / n) * Math.PI); // soft fade in/out
    const jitter = 0.3 + 0.7 * rnd();
    const v = Math.max(0.1, Math.min(1, jitter * (0.45 + 0.55 * env)));
    bars.push(v);
  }
  return bars;
}

function makeShapes(seedStr: string) {
  const rnd = seeded(seedStr);
  const palette = [C.teal, C.pink, C.coral, C.cyan];
  const kinds: CoverShape["kind"][] = ["tri", "dot", "sq", "ring"];
  const out: CoverShape[] = [];
  const count = 6 + Math.floor(rnd() * 3);
  for (let i = 0; i < count; i++) {
    out.push({
      kind: kinds[Math.floor(rnd() * kinds.length)],
      x: 8 + rnd() * 84,
      y: 8 + rnd() * 64,
      s: 4 + rnd() * 9,
      rot: rnd() * 360,
      color: palette[Math.floor(rnd() * palette.length)],
    });
  }
  return out;
}

function fmt(sec: number) {
  if (!isFinite(sec) || isNaN(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/* ---------- cover art (Memphis confetti + numeral) ---------- */
function Cover({ ep, size = 176 }: { ep: ArchiveEpisode; size?: number }) {
  const shapes = useMemo(() => makeShapes(ep.id), [ep.id]);
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{ display: "block", borderRadius: 3 }}
      aria-hidden="true"
    >
      <rect x="0" y="0" width="100" height="100" fill={C.panelHi} />
      <rect x="0" y="0" width="100" height="100" fill="none" stroke={C.line} />
      {shapes.map((sh, i) => {
        const t = `rotate(${sh.rot} ${sh.x} ${sh.y})`;
        if (sh.kind === "tri")
          return (
            <polygon
              key={i}
              points={`${sh.x},${sh.y - sh.s} ${sh.x - sh.s},${sh.y + sh.s} ${sh.x + sh.s},${sh.y + sh.s}`}
              fill={sh.color}
              opacity="0.9"
              transform={t}
            />
          );
        if (sh.kind === "dot")
          return <circle key={i} cx={sh.x} cy={sh.y} r={sh.s * 0.7} fill={sh.color} opacity="0.9" />;
        if (sh.kind === "ring")
          return (
            <circle key={i} cx={sh.x} cy={sh.y} r={sh.s * 0.8} fill="none" stroke={sh.color} strokeWidth="1.4" opacity="0.9" />
          );
        return (
          <rect key={i} x={sh.x - sh.s * 0.7} y={sh.y - sh.s * 0.7} width={sh.s * 1.4} height={sh.s * 1.4} fill={sh.color} opacity="0.9" transform={t} />
        );
      })}
      <text x="6" y="94" fontFamily={F.display} fontSize="34" fill={C.cream} opacity="0.95">
        {ep.no}
      </text>
    </svg>
  );
}

/* ---------- equalizer (active/playing indicator) ---------- */
function Eq({ color = C.teal }: { color?: string }) {
  return (
    <span className="bo-eq" aria-hidden="true">
      <i style={{ background: color }} />
      <i style={{ background: color }} />
      <i style={{ background: color }} />
      <i style={{ background: color }} />
    </span>
  );
}

/* ---------- waveform scrubber ---------- */
function Waveform({ peaks, progress, onSeek, height = 64 }: { peaks: number[]; progress: number; onSeek: (fraction: number) => void; height?: number }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);

  const fracFromEvent = useCallback((clientX: number) => {
    const el = ref.current;
    if (!el) return 0;
    const r = el.getBoundingClientRect();
    return Math.min(1, Math.max(0, (clientX - r.left) / r.width));
  }, []);

  const down = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    ref.current?.setPointerCapture?.(e.pointerId);
    onSeek(fracFromEvent(e.clientX));
  };
  const move = (e: React.PointerEvent<HTMLDivElement>) => {
    if (dragging.current) onSeek(fracFromEvent(e.clientX));
  };
  const up = (e: React.PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    ref.current?.releasePointerCapture?.(e.pointerId);
  };

  const lit = Math.round(progress * peaks.length);

  return (
    <div
      ref={ref}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      className="relative w-full cursor-pointer select-none touch-none"
      style={{ height }}
      role="slider"
      aria-label="Seek"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(progress * 100)}
    >
      <div className="flex items-center w-full h-full" style={{ gap: 2 }}>
        {peaks.map((p, i) => (
          <span
            key={i}
            style={{
              flex: "1 1 0",
              height: `${Math.max(8, p * 100)}%`,
              background: i < lit ? C.teal : C.creamFaint,
              borderRadius: 1,
              transition: "background 90ms linear",
            }}
          />
        ))}
      </div>
      {/* playhead */}
      <div
        className="absolute top-0 bottom-0"
        style={{
          left: `${progress * 100}%`,
          width: 2,
          background: C.pink,
          boxShadow: `0 0 8px ${C.pink}, 0 0 2px ${C.pink}`,
          transform: "translateX(-1px)",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

/* ---------- main ---------- */
export default function Archive({ episodes }: ArchiveProps) {
  const archiveEpisodes = episodes.length > 0 ? episodes : DEMO_EPISODES
  const hasEpisodes = episodes.length > 0
  const [currentId, setCurrentId] = useState(archiveEpisodes[0].id);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cur, setCur] = useState(0);
  const [dur, setDur] = useState(0);
  const [volume, setVolume] = useState(0.8);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const idx = archiveEpisodes.findIndex((e) => e.id === currentId);
  const ep = archiveEpisodes[idx] ?? archiveEpisodes[0];
  const peaks = useMemo(() => makeWaveform(ep.id), [ep.id]);

  useEffect(() => {
    if (!archiveEpisodes.some(episode => episode.id === currentId)) {
      setCurrentId(archiveEpisodes[0].id)
      setPlaying(false)
    }
  }, [archiveEpisodes, currentId])

  // load new track
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    setProgress(0);
    setCur(0);
    setDur(0);
    a.currentTime = 0;
    if (playing) a.play().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentId]);

  // play / pause
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    if (playing) a.play().catch(() => setPlaying(false));
    else a.pause();
  }, [playing]);

  // volume
  useEffect(() => {
    const a = audioRef.current;
    if (a) a.volume = muted ? 0 : volume;
  }, [volume, muted]);

  const select = (id: string) => {
    if (id === currentId) setPlaying((p) => !p);
    else {
      setCurrentId(id);
      setPlaying(true);
    }
  };

  const step = (dir: number) => {
    const ni = idx + dir;
    if (ni >= 0 && ni < archiveEpisodes.length) {
      setCurrentId(archiveEpisodes[ni].id);
      setPlaying(true);
    }
  };

  const seek = (frac: number) => {
    const a = audioRef.current;
    setProgress(frac);
    if (a && isFinite(a.duration)) {
      a.currentTime = frac * a.duration;
      setCur(a.currentTime);
    }
  };

  const onTime = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const a = e.currentTarget;
    setCur(a.currentTime);
    setProgress(a.duration ? a.currentTime / a.duration : 0);
  };

  return (
    <div style={{ background: C.ink, color: C.cream, fontFamily: F.head }} className="min-h-screen w-full">
      <style
        dangerouslySetInnerHTML={{
          __html: `
          @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;700;800;900&family=Bebas+Neue&family=Fraunces:ital,opsz,wght@0,9..144,400;1,9..144,400&family=Space+Mono:wght@400;700&display=swap');
          .bo-eq { display:inline-flex; align-items:flex-end; gap:2px; height:14px; }
          .bo-eq i { width:2px; height:100%; border-radius:1px; transform-origin:bottom; animation: bo-eq 900ms ease-in-out infinite; }
          .bo-eq i:nth-child(2){ animation-delay:150ms; }
          .bo-eq i:nth-child(3){ animation-delay:300ms; }
          .bo-eq i:nth-child(4){ animation-delay:80ms; }
          @keyframes bo-eq { 0%,100%{ transform:scaleY(0.3);} 50%{ transform:scaleY(1);} }
          .bo-play { animation: bo-glow 2.6s ease-in-out infinite; }
          @keyframes bo-glow { 0%,100%{ box-shadow:0 0 0 1px ${C.pink}, 0 0 14px rgba(232,23,106,0.35);} 50%{ box-shadow:0 0 0 1px ${C.pink}, 0 0 22px rgba(232,23,106,0.6);} }
          .bo-row { transition: background 140ms ease; }
          .bo-row:hover { background:${C.panel}; }
          .bo-bar { position:absolute; left:0; top:0; bottom:0; width:3px; background:${C.teal}; transform:scaleX(0); transform-origin:left; transition:transform 140ms ease; }
          .bo-row:hover .bo-bar { transform:scaleX(1); }
          button:focus-visible, [role="slider"]:focus-visible { outline:2px solid ${C.cyan}; outline-offset:3px; }
          @media (prefers-reduced-motion: reduce){ *{ animation:none !important; transition:none !important; } }
        `,
        }}
      />

      {hasEpisodes ? (
        <audio
          ref={audioRef}
          src={ep.audioUrl}
          onTimeUpdate={onTime}
          onLoadedMetadata={(e) => setDur(e.currentTarget.duration)}
          onEnded={() => (idx < archiveEpisodes.length - 1 ? step(1) : setPlaying(false))}
          preload="metadata"
        />
      ) : null}

      {/* top hairline */}
      <div style={{ height: 3, background: C.teal }} />

      <div className="max-w-5xl mx-auto px-5 sm:px-8">
        {/* header */}
        <header className="pt-14 pb-10">
          <div style={{ fontFamily: F.mono, color: C.teal, letterSpacing: "0.32em", fontSize: 12 }}>
            RADIO / SOUND
          </div>
          <h1
            style={{ fontFamily: F.display, fontSize: "clamp(56px, 12vw, 132px)", lineHeight: 0.9, marginTop: 14, letterSpacing: "0.01em" }}
          >
            THE ARCHIVE
          </h1>
          <p style={{ fontFamily: F.serif, fontStyle: "italic", color: C.creamDim, fontSize: 18, maxWidth: 520, marginTop: 16 }}>
            Curated mixes, live sessions, and field recordings. Listen front to back, straight from the published archive.
          </p>
        </header>

        {!hasEpisodes ? (
          <section
            style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 4 }}
            className="p-5 sm:p-7 mb-12"
          >
            <div style={{ fontFamily: F.mono, color: C.teal, fontSize: 12, letterSpacing: "0.18em" }}>
              RADIO ARCHIVE
            </div>
            <h2 style={{ fontFamily: F.head, fontWeight: 900, fontSize: "clamp(24px,4.5vw,40px)", lineHeight: 1.02, marginTop: 8, textTransform: "uppercase" }}>
              No published episodes yet.
            </h2>
            <p style={{ color: C.creamDim, fontSize: 14, marginTop: 12, maxWidth: 560 }}>
              Publish an episode in Studio and it will appear here automatically.
            </p>
          </section>
        ) : null}

        {/* now playing */}
        {hasEpisodes ? <section
          style={{ background: C.panel, border: `1px solid ${C.line}`, borderRadius: 4 }}
          className="p-5 sm:p-7 mb-12"
        >
          <div className="flex flex-col sm:flex-row gap-6">
            <div className="shrink-0 mx-auto sm:mx-0">
              <Cover ep={ep} size={176} />
            </div>
            <div className="flex-1 min-w-0 flex flex-col">
              <div style={{ fontFamily: F.mono, color: C.teal, fontSize: 12, letterSpacing: "0.18em" }}>
                EP.{ep.no} &nbsp;·&nbsp; {ep.date} &nbsp;·&nbsp; {ep.duration}
              </div>
              <h2 style={{ fontFamily: F.head, fontWeight: 900, fontSize: "clamp(24px,4.5vw,40px)", lineHeight: 1.02, marginTop: 8, textTransform: "uppercase" }}>
                {ep.title}
              </h2>

              <div className="mt-5">
                <Waveform peaks={peaks} progress={progress} onSeek={seek} height={66} />
                <div className="flex justify-between mt-2" style={{ fontFamily: F.mono, fontSize: 12, color: C.creamDim }}>
                  <span>{fmt(cur)}</span>
                  <span>{dur ? fmt(dur) : ep.duration}</span>
                </div>
              </div>

              {/* controls */}
              <div className="flex items-center gap-4 mt-4">
                <button onClick={() => step(-1)} disabled={idx === 0} aria-label="Previous episode"
                  style={{ color: idx === 0 ? C.creamFaint : C.cream, background: "none", border: "none", cursor: idx === 0 ? "default" : "pointer", padding: 6 }}>
                  <SkipBack size={20} />
                </button>

                <button
                  onClick={() => setPlaying((p) => !p)}
                  aria-label={playing ? "Pause" : "Play"}
                  className="bo-play"
                  style={{
                    width: 56, height: 56, borderRadius: "50%",
                    background: "transparent", border: `1px solid ${C.pink}`,
                    color: C.pink, display: "flex", alignItems: "center", justifyContent: "center",
                    cursor: "pointer", flexShrink: 0,
                  }}
                >
                  {playing ? <Pause size={24} fill={C.pink} /> : <Play size={24} fill={C.pink} style={{ marginLeft: 3 }} />}
                </button>

                <button onClick={() => step(1)} disabled={idx === archiveEpisodes.length - 1} aria-label="Next episode"
                  style={{ color: idx === archiveEpisodes.length - 1 ? C.creamFaint : C.cream, background: "none", border: "none", cursor: idx === archiveEpisodes.length - 1 ? "default" : "pointer", padding: 6 }}>
                  <SkipForward size={20} />
                </button>

                <div className="flex items-center gap-2 ml-auto" style={{ width: 132 }}>
                  <button onClick={() => setMuted((m) => !m)} aria-label={muted ? "Unmute" : "Mute"}
                    style={{ background: "none", border: "none", color: C.creamDim, cursor: "pointer", padding: 4 }}>
                    {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
                  </button>
                  <div
                    onPointerDown={(e) => {
                      const r = e.currentTarget.getBoundingClientRect();
                      const f = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
                      setVolume(f); setMuted(false);
                    }}
                    className="relative flex-1 cursor-pointer"
                    style={{ height: 4, background: C.creamFaint, borderRadius: 2 }}
                  >
                    <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${(muted ? 0 : volume) * 100}%`, background: C.teal, borderRadius: 2 }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section> : null}

        {/* episode list */}
        {hasEpisodes ? <section className="pb-24">
          <div className="flex items-baseline justify-between pb-3" style={{ borderBottom: `1px solid ${C.line}` }}>
            <span style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.22em", color: C.creamDim }}>EPISODE / TITLE</span>
            <span style={{ fontFamily: F.mono, fontSize: 11, letterSpacing: "0.22em", color: C.creamDim }}>PLAYBACK</span>
          </div>

          {archiveEpisodes.map((e) => {
            const active = e.id === currentId;
            return (
              <div
                key={e.id}
                onClick={() => select(e.id)}
                className="bo-row relative grid items-center cursor-pointer"
                style={{
                  gridTemplateColumns: "minmax(72px,110px) 1fr auto",
                  gap: 16,
                  padding: "20px 14px 20px 18px",
                  borderBottom: `1px solid ${C.line}`,
                  background: active ? C.panel : "transparent",
                }}
              >
                <span className="bo-bar" style={{ transform: active ? "scaleX(1)" : undefined }} />
                <div>
                  <div style={{ fontFamily: F.mono, fontSize: 13, color: C.teal }}>EP.{e.no}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 12, color: C.creamDim, marginTop: 4 }}>{e.date}</div>
                  <div style={{ fontFamily: F.mono, fontSize: 12, color: C.creamDim }}>{e.duration}</div>
                </div>

                <div className="min-w-0">
                  <h3 style={{ fontFamily: F.head, fontWeight: 800, fontSize: 17, textTransform: "uppercase", letterSpacing: "0.01em", color: active ? C.cream : C.cream }}>
                    {e.title}
                  </h3>
                  <p className="line-clamp-2" style={{ color: C.creamDim, fontSize: 14, marginTop: 6, maxWidth: 560 }}>
                    {e.desc}
                  </p>
                </div>

                <div className="flex items-center justify-end" style={{ width: 44 }}>
                  {active && playing ? (
                    <Eq color={C.teal} />
                  ) : (
                    <span
                      style={{
                        width: 38, height: 38, borderRadius: "50%",
                        border: `1px solid ${active ? C.pink : C.creamFaint}`,
                        color: active ? C.pink : C.cream,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}
                    >
                      <Play size={16} fill={active ? C.pink : C.cream} style={{ marginLeft: 2 }} />
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </section> : null}
      </div>
    </div>
  );
}
