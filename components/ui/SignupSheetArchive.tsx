"use client";

/**
 * SignupSheetArchive — Buena Onda
 * Swipeable, zoomable archive of handwritten Open Decks sign-up sheets.
 * Mobile-first. No dependencies. Brand colors inline (never Tailwind arbitrary classes).
 *
 * Usage on the event page:
 *   <SignupSheetArchive sheets={event.signup_sheets} />
 * where signup_sheets = [{ url: string, label?: string }]
 */

import { useEffect, useRef, useState, useCallback } from "react";

type Sheet = { url: string; label?: string };

const C = {
  cream: "#F8F7F3",
  ink: "#2F2F2D",
  teal: "#1A9E9E",
  pink: "#E8176A",
  paper: "#FCFBF6",
  line: "rgba(47,47,45,.16)",
  faint: "rgba(47,47,45,.55)",
};

const mono: React.CSSProperties = {
  fontFamily: "ui-monospace, 'SF Mono', 'Roboto Mono', Menlo, monospace",
  textTransform: "uppercase",
  letterSpacing: ".18em",
};

export default function SignupSheetArchive({ sheets }: { sheets: Sheet[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [lightbox, setLightbox] = useState<number | null>(null);

  // track active slide on scroll
  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    let t: ReturnType<typeof setTimeout>;
    const onScroll = () => {
      clearTimeout(t);
      t = setTimeout(() => {
        const i = Math.round(rail.scrollLeft / rail.clientWidth);
        if (i >= 0 && i < sheets.length) setActive(i);
      }, 60);
    };
    rail.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      clearTimeout(t);
      rail.removeEventListener("scroll", onScroll);
    };
  }, [sheets.length]);

  if (!sheets?.length) return null;
  const pad = (n: number) => String(n + 1).padStart(2, "0");

  return (
    <section aria-label="Sign-up sheet archive">
      {/* counter + dots */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ ...mono, fontSize: 11, letterSpacing: ".12em", color: C.ink }}>
          <b style={{ fontWeight: 600 }}>{pad(active)}</b> / {String(sheets.length).padStart(2, "0")}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {sheets.map((_, i) => (
            <span
              key={i}
              style={{
                width: i === active ? 18 : 6,
                height: 6,
                borderRadius: 3,
                background: i === active ? C.teal : C.line,
                transition: "all .25s",
              }}
            />
          ))}
        </div>
      </div>

      {/* carousel */}
      <div
        ref={railRef}
        style={{
          display: "flex",
          gap: 14,
          overflowX: "auto",
          scrollSnapType: "x mandatory",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          padding: "6px 2px",
        }}
      >
        {sheets.map((s, i) => (
          <div key={i} style={{ flex: "0 0 100%", scrollSnapAlign: "center", scrollSnapStop: "always" }}>
            <button
              onClick={() => setLightbox(i)}
              aria-label={`Open ${s.label ?? `sheet ${i + 1}`} fullscreen`}
              style={{
                display: "block",
                width: "100%",
                position: "relative",
                background: C.paper,
                border: `1px solid ${C.line}`,
                borderRadius: 3,
                padding: 10,
                boxShadow: "0 12px 28px -18px rgba(47,47,45,.45)",
                cursor: "zoom-in",
              }}
            >
              {/* tape corners */}
              <span style={tapeStyle("left")} aria-hidden />
              <span style={tapeStyle("right")} aria-hidden />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={s.url}
                alt={s.label ?? `Open Decks sign-up sheet ${i + 1}`}
                loading={i === 0 ? "eager" : "lazy"}
                style={{ display: "block", width: "100%", height: "auto", borderRadius: 2 }}
              />
              <span
                style={{
                  ...mono,
                  position: "absolute",
                  right: 14,
                  bottom: 12,
                  fontSize: 9,
                  letterSpacing: ".14em",
                  color: C.faint,
                  background: "rgba(252,251,246,.85)",
                  padding: "3px 7px",
                  borderRadius: 2,
                }}
              >
                tap to zoom
              </span>
            </button>
          </div>
        ))}
      </div>

      {/* caption */}
      {sheets[active]?.label && (
        <div
          style={{
            marginTop: 14,
            borderTop: `1px solid ${C.line}`,
            paddingTop: 12,
            ...mono,
            fontSize: 11,
            letterSpacing: ".14em",
            color: C.ink,
          }}
        >
          {sheets[active].label}
        </div>
      )}

      {lightbox !== null && (
        <Lightbox sheets={sheets} index={lightbox} onIndex={setLightbox} onClose={() => setLightbox(null)} />
      )}
    </section>
  );
}

function tapeStyle(side: "left" | "right"): React.CSSProperties {
  return {
    position: "absolute",
    top: -9,
    [side]: 18,
    width: 64,
    height: 20,
    background: "rgba(232,23,106,.10)",
    border: "1px solid rgba(232,23,106,.25)",
    transform: side === "left" ? "rotate(-3deg)" : "rotate(3deg)",
    pointerEvents: "none",
  } as React.CSSProperties;
}

/* ---------------- Lightbox with pinch / double-tap / wheel zoom ---------------- */

function Lightbox({
  sheets,
  index,
  onIndex,
  onClose,
}: {
  sheets: Sheet[];
  index: number;
  onIndex: (i: number) => void;
  onClose: () => void;
}) {
  const docRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const view = useRef({ scale: 1, tx: 0, ty: 0 });
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({ startDist: 0, startScale: 1, drag: null as null | { x: number; y: number; tx: number; ty: number }, moved: false, lastTap: 0 });
  const MIN = 1, MAX = 4;

  const render = useCallback(() => {
    const { scale, tx, ty } = view.current;
    if (docRef.current) docRef.current.style.transform = `translate(${tx}px,${ty}px) scale(${scale})`;
  }, []);

  const clampPan = useCallback(() => {
    const v = view.current;
    const el = docRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const maxX = Math.max(0, (r.width - window.innerWidth) / 2) + 20;
    const maxY = Math.max(0, (r.height - window.innerHeight) / 2) + 20;
    v.tx = Math.max(-maxX, Math.min(maxX, v.tx));
    v.ty = Math.max(-maxY, Math.min(maxY, v.ty));
  }, []);

  const reset = useCallback(() => {
    view.current = { scale: 1, tx: 0, ty: 0 };
    if (overlayRef.current) overlayRef.current.style.background = "rgba(20,20,19,.94)";
    render();
  }, [render]);

  const go = useCallback(
    (dir: 1 | -1) => {
      onIndex((index + dir + sheets.length) % sheets.length);
      view.current = { scale: 1, tx: 0, ty: 0 };
      requestAnimationFrame(render);
    },
    [index, sheets.length, onIndex, render]
  );

  // lock body scroll + keyboard
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [go, onClose]);

  const zoomAt = (cx: number, cy: number, nextScale: number) => {
    const v = view.current;
    const ox = cx - window.innerWidth / 2;
    const oy = cy - window.innerHeight / 2;
    const ratio = nextScale / v.scale;
    v.tx = ox - (ox - v.tx) * ratio;
    v.ty = oy - (oy - v.ty) * ratio;
    v.scale = nextScale;
    clampPan();
    render();
  };

  const onPointerDown = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current.moved = false;
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      gesture.current.startDist = Math.hypot(a.x - b.x, a.y - b.y);
      gesture.current.startScale = view.current.scale;
    } else {
      gesture.current.drag = { x: e.clientX, y: e.clientY, tx: view.current.tx, ty: view.current.ty };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    gesture.current.moved = true;
    const v = view.current;
    if (pts.current.size >= 2) {
      const [a, b] = [...pts.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const m = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const ns = Math.max(MIN, Math.min(MAX, gesture.current.startScale * (d / gesture.current.startDist)));
      zoomAt(m.x, m.y, ns);
    } else if (gesture.current.drag) {
      const dx = e.clientX - gesture.current.drag.x;
      const dy = e.clientY - gesture.current.drag.y;
      if (v.scale > 1.02) {
        v.tx = gesture.current.drag.tx + dx;
        v.ty = gesture.current.drag.ty + dy;
        clampPan();
        render();
      } else {
        // rubber-band drag at scale 1 (swipe-down-to-close feedback)
        if (docRef.current) docRef.current.style.transform = `translate(${dx * 0.4}px,${dy}px) scale(1)`;
        if (overlayRef.current)
          overlayRef.current.style.background = `rgba(20,20,19,${Math.max(0.4, 0.94 - Math.abs(dy) / 600)})`;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    const wasSingle = pts.current.size === 1;
    const drag = gesture.current.drag;
    pts.current.delete(e.pointerId);

    if (pts.current.size === 0) {
      // double-tap zoom toggle
      if (wasSingle && !gesture.current.moved) {
        const now = Date.now();
        if (now - gesture.current.lastTap < 300) {
          if (view.current.scale > 1.05) reset();
          else zoomAt(e.clientX, e.clientY, 2.5);
          gesture.current.lastTap = 0;
          gesture.current.drag = null;
          return;
        }
        gesture.current.lastTap = now;
      }
      // swipe gestures at scale 1
      if (view.current.scale <= 1.02 && drag) {
        const dy = e.clientY - drag.y;
        const dx = e.clientX - drag.x;
        if (dy > 110 && Math.abs(dy) > Math.abs(dx)) {
          onClose();
          return;
        }
        if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy)) {
          go(dx < 0 ? 1 : -1);
          return;
        }
      }
      if (view.current.scale <= 1.02) reset();
      gesture.current.drag = null;
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const ns = Math.max(MIN, Math.min(MAX, view.current.scale * (e.deltaY < 0 ? 1.12 : 0.9)));
    zoomAt(e.clientX, e.clientY, ns);
  };

  const sheet = sheets[index];
  const pad = (n: number) => String(n + 1).padStart(2, "0");

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={sheet.label ?? "Sign-up sheet"}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      style={{ position: "fixed", inset: 0, background: "rgba(20,20,19,.94)", zIndex: 50, touchAction: "none", overflow: "hidden" }}
    >
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div ref={docRef} style={{ willChange: "transform", transformOrigin: "center center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={sheet.url}
            alt={sheet.label ?? `Sign-up sheet ${index + 1}`}
            draggable={false}
            style={{ display: "block", maxWidth: "94vw", maxHeight: "86vh", width: "auto", height: "auto", userSelect: "none" }}
          />
        </div>
      </div>

      {/* top bar */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "16px 18px",
          color: C.cream,
          ...mono,
          fontSize: 10,
          letterSpacing: ".16em",
          pointerEvents: "none",
        }}
      >
        <span>
          {pad(index)} / {String(sheets.length).padStart(2, "0")}
          {sheet.label ? ` — ${sheet.label}` : ""}
        </span>
        <button
          onPointerDown={(e) => e.stopPropagation()}
          onClick={onClose}
          aria-label="Close"
          style={{ pointerEvents: "auto", cursor: "pointer", fontSize: 22, lineHeight: 1, padding: "4px 8px", background: "none", border: "none", color: C.cream }}
        >
          ✕
        </button>
      </div>

      {/* desktop arrows */}
      {sheets.length > 1 && (
        <>
          <NavArrow side="left" onClick={() => go(-1)} />
          <NavArrow side="right" onClick={() => go(1)} />
        </>
      )}

      <div
        style={{
          position: "absolute",
          bottom: 18,
          left: 0,
          right: 0,
          textAlign: "center",
          color: "rgba(248,247,243,.6)",
          ...mono,
          fontSize: 9,
          letterSpacing: ".16em",
          pointerEvents: "none",
        }}
      >
        Pinch or double-tap to zoom · swipe down to close
      </div>
    </div>
  );
}

function NavArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  return (
    <button
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClick}
      aria-label={side === "left" ? "Previous sheet" : "Next sheet"}
      style={{
        position: "absolute",
        top: "50%",
        transform: "translateY(-50%)",
        [side]: 2,
        color: "rgba(248,247,243,.7)",
        fontSize: 34,
        padding: "10px 14px",
        cursor: "pointer",
        userSelect: "none",
        zIndex: 2,
        background: "none",
        border: "none",
        fontFamily: "'Bebas Neue', sans-serif",
      } as React.CSSProperties}
    >
      {side === "left" ? "‹" : "›"}
    </button>
  );
}
