'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { MiamiGeoData, createMiamiRoute } from '../../../lib/real-miami/miami-geo';
import styles from './MiamiMap.module.css';
import landmarkRegistry from '../../../public/real-miami/miami/landmarks.json';

type Route = ReturnType<typeof createMiamiRoute>;
export type MiamiMapProps = {
  data: MiamiGeoData;
  route: Route;
  /** Read current distance without updating the 3D scene's React tree every frame. */
  getDistance: () => number;
};
const SIZE = 1536, EXTENT = 5000, HALF = EXTENT / 2;
const namedStreets = new Set(['Ocean Drive', 'Collins Avenue', 'Washington Avenue', 'Alton Road', 'West Avenue', 'Meridian Avenue', 'Dade Boulevard', 'Pine Tree Drive', 'Indian Creek Drive', '5th Street', 'Lincoln Road', 'Española Way', 'South Pointe Drive']);
const bearing = (yaw: number) => ((-yaw * 180 / Math.PI) % 360 + 360) % 360;
const compass = (yaw: number) => ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'][Math.round(bearing(yaw) / 45) % 8];

export function MiamiMap({ data, route, getDistance }: MiamiMapProps) {
  const [expanded, setExpanded] = useState(false);
  const [headingUp, setHeadingUp] = useState(true);
  const [position, setPosition] = useState(() => route.sample(getDistance()));
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reader = useRef(getDistance); reader.current = getDistance;
  const streetLabels = useMemo(() => {
    const result = new Map<string, [number, number][]>();
    for (const road of data.roads) if (namedStreets.has(road.name)) {
      const points = result.get(road.name) || [];
      points.push(road.points[Math.floor(road.points.length / 2)]);
      result.set(road.name, points);
    }
    return result;
  }, [data]);
  const landmarkLabels = useMemo(() => {
    const places = data.landmarks.filter(p => p.point && /Art Deco|Jewish Museum|Botanical|Holocaust|Versace|Lummus|South Pointe/i.test(p.name)).slice(0, 8).map(p => ({ ...p, name: p.name.replace('Sanford L Ziff ', '').replace('Miami Beach Botanical Garden', 'Botanical Garden') }));
    // The park's OSM name is retained in osm-raw.json; its real polygon is in the bake.
    const park = data.land.find(p => p.id === 76677464);
    if (park) places.push({ id: park.id as number, name: 'Lummus Park', type: 'park', point: park.points.reduce<[number, number]>((a, p) => [a[0] + p[0] / park.points.length, a[1] + p[1] / park.points.length], [0, 0]) });
    for (const hero of landmarkRegistry.landmarks) places.push({ id: hero.osmBuildingId, name: hero.name, type: 'hotel', point: [hero.position.x, hero.position.z] });
    return places;
  }, [data]);
  useEffect(() => {
    const timer = window.setInterval(() => { if (!document.hidden) setPosition(route.sample(reader.current())); }, 125);
    return () => window.clearInterval(timer);
  }, [route]);
  useEffect(() => {
    if (!expanded) return;
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') setExpanded(false); };
    window.addEventListener('keydown', escape);
    return () => window.removeEventListener('keydown', escape);
  }, [expanded]);
  // All geographic geometry is drawn once; the live radar only crops this bitmap.
  const baseRef = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const image = document.createElement('canvas'); image.width = image.height = SIZE;
    const ctx = image.getContext('2d'); if (!ctx) return;
    const scale = SIZE / EXTENT;
    ctx.fillStyle = '#10222e'; ctx.fillRect(0, 0, SIZE, SIZE);
    const path = (points: [number, number][]) => {
      ctx.beginPath(); points.forEach((p, i) => { const x = (p[0] + HALF) * scale, y = (p[1] + HALF) * scale; if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y); });
    };
    for (const land of data.land) if (land.type === 'island' || land.type === 'land') {
      path(land.points); ctx.closePath(); ctx.fillStyle = '#344345'; ctx.fill();
      ctx.strokeStyle = '#90a39a'; ctx.lineWidth = 1.4; ctx.stroke();
    }
    for (const land of data.land) if (/^(park|grass|recreation_ground|wood|beach)$/.test(land.type) && land.points.length > 3) {
      path(land.points); ctx.closePath(); ctx.fillStyle = land.type === 'beach' ? '#697168' : '#3c5147'; ctx.fill();
    }
    ctx.fillStyle = '#4e5b59';
    for (const building of data.buildings) { path(building.points); ctx.closePath(); ctx.fill(); }
    for (const road of data.roads) {
      if (/footway|path|steps|cycleway/.test(road.type)) continue;
      path(road.points); ctx.strokeStyle = road.drive ? '#b0b9b3' : '#77867c';
      ctx.lineWidth = Math.max(.6, road.width * scale); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
    }
    path(data.route.points); ctx.strokeStyle = '#87d9c5'; ctx.globalAlpha = .72; ctx.lineWidth = 2.2; ctx.stroke(); ctx.globalAlpha = 1;
    baseRef.current = image;
    return () => { baseRef.current = null; image.width = image.height = 1; };
  }, [data]);
  useEffect(() => {
    const canvas = canvasRef.current, base = baseRef.current;
    if (!canvas || !base) return;
    const ctx = canvas.getContext('2d'); if (!ctx) return;
    const width = expanded ? 720 : 240, height = expanded ? 620 : 170;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr; canvas.height = height * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const span = expanded ? EXTENT : 1050, scale = Math.min(width, height) / span;
    const center = expanded ? { x: 0, z: 0 } : position;
    // World +z points south. Rotating by yaw cancels the Jeep marker's -yaw.
    const rotation = !expanded && headingUp ? position.yaw : 0;
    const cos = Math.cos(rotation), sin = Math.sin(rotation);
    ctx.fillStyle = '#10222e'; ctx.fillRect(0, 0, width, height);
    ctx.save(); ctx.translate(width / 2, height / 2); ctx.rotate(rotation);
    ctx.drawImage(base, -(center.x + HALF) * scale, -(center.z + HALF) * scale, EXTENT * scale, EXTENT * scale);
    ctx.restore();
    const screen = (p: [number, number]) => {
      const x = (p[0] - center.x) * scale, y = (p[1] - center.z) * scale;
      return [width / 2 + cos * x - sin * y, height / 2 + sin * x + cos * y];
    };
    const occupied: [number, number][] = [];
    ctx.font = `${expanded ? 10 : 9}px system-ui, sans-serif`; ctx.textAlign = 'center';
    for (const [name, points] of streetLabels) {
      const best = points.reduce((a, b) => Math.hypot(a[0] - center.x, a[1] - center.z) < Math.hypot(b[0] - center.x, b[1] - center.z) ? a : b);
      const [x, y] = screen(best);
      if (x < 25 || x > width - 25 || y < 24 || y > height - 25 || occupied.some(p => Math.abs(p[0] - x) < 100 && Math.abs(p[1] - y) < 18)) continue;
      occupied.push([x, y]); ctx.lineWidth = 3; ctx.strokeStyle = '#263637'; ctx.strokeText(name, x, y); ctx.fillStyle = '#ecede2'; ctx.fillText(name, x, y);
    }
    if (expanded) {
      ctx.font = '600 12px system-ui, sans-serif'; ctx.fillStyle = '#d6e1d4';
      for (const [label, x, z] of [['SOUTH BEACH', 50, 850], ['MID-BEACH', 900, -2080], ['BISCAYNE BAY', -1750, -950], ['ATLANTIC OCEAN', 1650, 650]] as [string, number, number][]) {
        const p = screen([x, z]); ctx.lineWidth = 4; ctx.strokeStyle = '#10222ecc'; ctx.strokeText(label, p[0], p[1]); ctx.fillText(label, p[0], p[1]);
      }
    }
    ctx.font = `${expanded ? 10 : 9}px system-ui, sans-serif`;
    for (const place of landmarkLabels) {
      const [x, y] = screen(place.point);
      if (x < 35 || x > width - 35 || y < 25 || y > height - 25 || occupied.some(p => Math.abs(p[0] - x) < 85 && Math.abs(p[1] - y) < 18)) continue;
      occupied.push([x, y]); ctx.lineWidth = 3; ctx.strokeStyle = '#10222e'; ctx.strokeText(place.name, x, y); ctx.fillStyle = '#bddc9c'; ctx.fillText(place.name, x, y);
    }
    const [px, py] = screen([position.x, position.z]);
    ctx.save(); ctx.translate(px, py); ctx.rotate(rotation - position.yaw);
    if (!expanded) {
      const cone = ctx.createRadialGradient(0, 0, 5, 0, 0, 66);
      cone.addColorStop(0, '#9cead64a'); cone.addColorStop(1, '#9cead600');
      ctx.fillStyle = cone; ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.arc(0, 0, 66, -Math.PI / 2 - .48, -Math.PI / 2 + .48); ctx.closePath(); ctx.fill();
    }
    ctx.shadowColor = '#9cead6'; ctx.shadowBlur = 8;
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(0, 4); ctx.lineTo(-6, 7); ctx.closePath();
    ctx.fillStyle = '#f4fff6'; ctx.fill(); ctx.shadowBlur = 0; ctx.lineWidth = 1.5; ctx.strokeStyle = '#10222e'; ctx.stroke(); ctx.restore();
    ctx.font = '600 11px system-ui, sans-serif'; ctx.fillStyle = '#e8eadf'; ctx.textAlign = 'center';
    ctx.fillText('N', 18, 18);
    ctx.save(); ctx.translate(18, 30); ctx.rotate(rotation);
    ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(3, 4); ctx.lineTo(-3, 4); ctx.closePath(); ctx.fill(); ctx.restore();
    ctx.textAlign = 'left';
    const meters = expanded ? 1000 : 200, bar = meters * scale;
    ctx.fillStyle = '#e8eadf'; ctx.fillRect(12, height - 15, bar, 2); ctx.font = '9px system-ui, sans-serif'; ctx.fillText(meters >= 1000 ? '1 km' : '200 m', 12, height - 20);
  }, [position, expanded, headingUp, streetLabels, landmarkLabels, data]);

  return <>{expanded && <button type="button" className={styles.backdrop} aria-label="Close full Miami map" onClick={() => setExpanded(false)} />}<aside className={`${styles.map} ${expanded ? styles.expanded : ''}`} aria-label="Live Miami map" role={expanded ? 'dialog' : undefined} aria-modal={expanded || undefined}>
    <div className={styles.header}><span>MIAMI BEACH <b>LIVE</b></span><button type="button" onClick={() => setExpanded(v => !v)} aria-expanded={expanded} aria-controls="cruise-miami-map" aria-label={expanded ? 'Close full Miami map' : 'Expand Miami map'}>{expanded ? 'CLOSE ×' : 'MAP ↗'}</button></div>
    {!expanded && <button type="button" className={styles.orientation} onClick={() => setHeadingUp(v => !v)} aria-label="Use heading-up Miami radar" aria-pressed={headingUp}>{headingUp ? 'HEADING UP' : 'NORTH UP'}</button>}
    <canvas ref={canvasRef} id="cruise-miami-map" className={styles.canvas} data-orientation={!expanded && headingUp ? 'heading-up' : 'north-up'} aria-label={`${!expanded && headingUp ? 'Heading-up radar' : 'North-up map'}. Jeep on ${position.streetName}, heading ${compass(position.yaw)}.`} />
    <div className={styles.location}><strong>{position.streetName}</strong><span>{compass(position.yaw)} · {Math.round(bearing(position.yaw))}°</span></div>
    {expanded && <div className={styles.coordinates}>{position.lat.toFixed(5)}° N · {Math.abs(position.lon).toFixed(5)}° W <span>5 × 5 km · South Beach prototype</span></div>}
    <div className={styles.credit}><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a><span>LOCAL MAP</span></div>
  </aside></>;
}
export default MiamiMap;
