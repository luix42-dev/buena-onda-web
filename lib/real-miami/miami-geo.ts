export type MiamiPoint = [number, number];
export type MiamiGeoData = {
  version: number; origin: [number, number]; bounds: number[]; extentMeters: number; chunkSize: number;
  roads: { id: number; name: string; type: string; width: number; points: MiamiPoint[]; drive: boolean; oneway: string }[];
  buildings: { id: number; name: string; type: string; height: number; levels: number | null; points: MiamiPoint[]; estimatedHeight: boolean }[];
  land: { id: number | string; type: string; points: MiamiPoint[] }[];
  landmarks: { id: number; name: string; type: string; point: MiamiPoint }[];
  chunks: Record<string, { roads: number[]; buildings: number[]; land: number[] }>;
  route: { points: MiamiPoint[]; length: number; streetNames: string[]; osmNodeIds: number[]; osmWayIds: number[]; stops: number[][] };
  provenance: Record<string, string>;
};
export type MiamiWorldData = MiamiGeoData;
export function createMiamiRoute(data: MiamiGeoData) {
  const points = data.route.points;
  const cumulative = [0];
  for (let i = 1; i < points.length; i++) cumulative.push(cumulative[i - 1] + Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]));
  const length = cumulative[cumulative.length - 1];
  function raw(distance: number) {
    const s = ((distance % length) + length) % length;
    let lo = 0, hi = cumulative.length - 1;
    while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (cumulative[mid] <= s) lo = mid; else hi = mid; }
    const a = points[lo], b = points[hi], t = (s - cumulative[lo]) / Math.max(.001, cumulative[hi] - cumulative[lo]);
    return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t, index: lo };
  }
  function smooth(distance: number) {
    const s = ((distance % length) + length) % length, p = raw(distance);
    for (const corner of [p.index, p.index + 1]) {
      const index = corner === points.length - 1 ? 0 : corner;
      const previous = index === 0 ? points.length - 2 : index - 1, next = index + 1;
      const vertex = points[index], a = points[previous], b = points[next];
      const incoming = Math.hypot(vertex[0] - a[0], vertex[1] - a[1]), outgoing = Math.hypot(b[0] - vertex[0], b[1] - vertex[1]);
      const radius = Math.min(3, incoming * .3, outgoing * .3);
      let delta = s - cumulative[corner];
      if (delta > length / 2) delta -= length; if (delta < -length / 2) delta += length;
      if (radius <= .01 || Math.abs(delta) > radius) continue;
      const t = (delta + radius) / (2 * radius), u = 1 - t;
      const ax = vertex[0] + (a[0] - vertex[0]) * radius / incoming, az = vertex[1] + (a[1] - vertex[1]) * radius / incoming;
      const bx = vertex[0] + (b[0] - vertex[0]) * radius / outgoing, bz = vertex[1] + (b[1] - vertex[1]) * radius / outgoing;
      return { x: u * u * ax + 2 * u * t * vertex[0] + t * t * bx, z: u * u * az + 2 * u * t * vertex[1] + t * t * bz, index: p.index };
    }
    return p;
  }
  function sample(distance: number) {
    const p = smooth(distance), before = smooth(distance - .5), after = smooth(distance + .5);
    const yaw = Math.atan2(-(after.x - before.x), -(after.z - before.z));
    const previousYaw = Math.atan2(-(p.x - before.x), -(p.z - before.z));
    const nextYaw = Math.atan2(-(after.x - p.x), -(after.z - p.z));
    const difference = Math.atan2(Math.sin(nextYaw - previousYaw), Math.cos(nextYaw - previousYaw));
    return { x: p.x, y: 0, z: p.z, dx: -(after.x - before.x), dy: 0, yaw, metric: 1, curvature: difference, streetName: data.route.streetNames[p.index] || 'Miami Beach', lat: data.origin[1] - p.z / 111320, lon: data.origin[0] + p.x / (111320 * Math.cos(data.origin[1] * Math.PI / 180)) };
  }
  return { length, points, sample };
}
