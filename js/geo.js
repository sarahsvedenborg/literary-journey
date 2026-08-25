export const WIDTH = 1000;
export const HEIGHT = 620;

export const BOUNDS = {
  west: -95,
  east: 128,
  south: -30,
  north: 74,
};

function miller(lat) {
  const rad = (Math.max(-85, Math.min(85, lat)) * Math.PI) / 180;
  return 1.25 * Math.log(Math.tan(Math.PI / 4 + 0.4 * rad));
}

const Y0 = miller(BOUNDS.north);
const Y1 = miller(BOUNDS.south);

export function project(lat, lng) {
  const x = ((lng - BOUNDS.west) / (BOUNDS.east - BOUNDS.west)) * WIDTH;
  const y = ((miller(lat) - Y0) / (Y1 - Y0)) * HEIGHT;
  return { x, y };
}

export function ringPath(ring) {
  return `${ring
    .map((point, index) => {
      const { x, y } = project(point[1], point[0]);
      return `${index === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ")} Z`;
}

const EURASIA = [
  [-9.5, 36.8], [-8.9, 41.9], [-9.1, 43.8], [-7.0, 43.8], [-1.8, 43.3],
  [-1.2, 46.0], [-4.4, 48.4], [-1.6, 49.0], [1.6, 51.0], [2.4, 51.1],
  [4.4, 52.4], [6.8, 53.5], [8.6, 54.0], [8.5, 56.9], [10.4, 57.6],
  [5.3, 58.6], [4.9, 61.8], [8.5, 63.4], [12.2, 65.4], [14.5, 67.8],
  [18.6, 69.6], [25.2, 71.1], [31.2, 70.4], [36.0, 69.2], [40.5, 67.8],
  [44.0, 66.0], [53.0, 68.2], [66.5, 71.2], [88.0, 73.2], [110.0, 73.5],
  [125.0, 72.8], [127.5, 62.0], [127.5, 49.5], [125.0, 41.0], [122.4, 31.2],
  [121.0, 24.2], [109.0, 21.4], [104.0, 10.2], [100.0, 13.5], [97.5, 16.8],
  [94.2, 18.0], [88.0, 21.5], [80.2, 15.8], [80.0, 10.6], [77.5, 8.1],
  [73.0, 18.4], [69.8, 22.4], [67.0, 24.0], [62.0, 25.2], [57.4, 27.0],
  [52.0, 26.8], [48.2, 29.0], [44.4, 12.6], [42.5, 15.2], [39.8, 20.0],
  [36.8, 21.3], [34.6, 28.2], [34.9, 32.6], [35.8, 35.8], [32.2, 31.3],
  [29.8, 31.2], [28.8, 36.6], [27.2, 38.2], [26.2, 39.6], [27.4, 41.6],
  [29.0, 41.1], [32.0, 36.6], [36.2, 36.6], [38.4, 36.2], [36.4, 40.8],
  [27.8, 40.8], [23.2, 39.8], [21.1, 38.2], [20.0, 39.6], [19.5, 41.8],
  [18.5, 40.2], [17.2, 40.6], [16.0, 38.0], [12.5, 37.6], [9.2, 39.1],
  [8.2, 40.8], [8.6, 44.2], [9.6, 44.4], [12.4, 45.4], [13.7, 45.6],
  [13.8, 42.4], [14.8, 40.8], [12.5, 41.9], [12.2, 44.4], [9.8, 44.2],
  [7.6, 43.8], [3.0, 43.2], [-1.0, 43.3], [-5.6, 36.1], [-5.4, 36.0],
  [-9.5, 36.8],
];

const UNITED_KINGDOM = [
  [-5.0, 58.6], [-6.2, 57.6], [-6.3, 56.5], [-5.6, 55.3], [-4.9, 54.7],
  [-3.4, 54.6], [-4.8, 53.4], [-5.2, 51.8], [-5.0, 50.3], [-2.7, 50.3],
  [1.4, 51.1], [1.6, 52.8], [-0.1, 54.1], [-1.6, 55.8], [-2.0, 56.8],
  [-3.3, 57.7], [-5.0, 58.6],
];

const IRELAND = [
  [-10.2, 54.4], [-9.8, 53.2], [-8.6, 51.7], [-6.0, 52.1], [-6.0, 54.1],
  [-7.3, 55.3], [-8.2, 54.8], [-10.2, 54.4],
];

const AFRICA = [
  [-5.6, 35.9], [-9.8, 31.4], [-16.8, 21.8], [-17.5, 14.8], [-16.3, 12.0],
  [-8.0, 4.8], [6.5, 4.2], [8.6, 4.4], [14.5, 12.2], [18.6, 4.2],
  [39.6, -3.4], [42.4, 2.0], [51.0, 11.6], [43.4, 12.4], [39.0, 15.6],
  [32.6, 22.0], [31.4, 31.4], [25.0, 31.6], [10.2, 36.8], [-2.2, 35.2],
  [-5.6, 35.9],
];

const NORTH_AMERICA = [
  [-95.0, 72.0], [-95.0, 49.0], [-95.0, 32.0], [-97.2, 25.9], [-90.0, 29.0],
  [-84.0, 30.0], [-81.8, 24.6], [-80.2, 25.3], [-80.0, 32.0], [-75.6, 35.2],
  [-74.0, 40.5], [-69.9, 41.8], [-67.0, 44.6], [-66.0, 44.8], [-60.0, 47.0],
  [-55.6, 51.5], [-55.8, 53.5], [-64.0, 60.2], [-68.0, 58.5], [-78.0, 62.4],
  [-85.0, 65.5], [-88.5, 70.0], [-95.0, 72.0],
];

const SOUTH_AMERICA = [
  [-51.0, 4.2], [-60.0, 8.4], [-70.0, 12.2], [-77.0, 7.5], [-80.0, -3.0],
  [-76.0, -14.0], [-70.5, -18.4], [-71.4, -41.0], [-73.5, -52.0],
  [-68.0, -55.8], [-65.0, -43.0], [-62.4, -38.6], [-52.4, -32.0],
  [-40.5, -22.2], [-34.8, -8.5], [-34.9, -6.8], [-43.5, -2.3],
  [-48.5, -1.0], [-51.0, 4.2],
];

const GREENLAND = [
  [-50.0, 60.0], [-44.0, 60.2], [-42.0, 64.0], [-29.5, 68.4], [-22.0, 70.2],
  [-21.5, 73.5], [-40.0, 73.8], [-54.0, 71.5], [-58.0, 67.0], [-50.0, 60.0],
];

const CUBA = [
  [-84.9, 21.9], [-77.3, 20.0], [-74.1, 20.2], [-77.0, 22.6], [-82.5, 23.2],
  [-84.9, 21.9],
];

export const LAND = [
  EURASIA,
  UNITED_KINGDOM,
  IRELAND,
  AFRICA,
  NORTH_AMERICA,
  SOUTH_AMERICA,
  GREENLAND,
  CUBA,
];

export function graticulePath() {
  const lines = [];
  for (let lng = -90; lng <= 120; lng += 15) {
    const pts = [];
    for (let lat = BOUNDS.south; lat <= BOUNDS.north; lat += 4) {
      pts.push(project(lat, lng));
    }
    lines.push(pts);
  }
  for (let lat = -15; lat <= 75; lat += 15) {
    const pts = [];
    for (let lng = BOUNDS.west; lng <= BOUNDS.east; lng += 4) {
      pts.push(project(lat, lng));
    }
    lines.push(pts);
  }
  return lines
    .map((pts) =>
      pts
        .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
        .join(" ")
    )
    .join(" ");
}

export function catmullRom(points) {
  if (points.length === 0) return "";
  if (points.length === 1) return `M${points[0].x},${points[0].y}`;
  if (points.length === 2) {
    return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y}`;
  }
  let d = `M${points[0].x},${points[0].y}`;
  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[i - 1] || points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2.x.toFixed(1)},${p2.y.toFixed(1)}`;
  }
  return d;
}

export function clusterOffsets(count) {
  if (count <= 1) return [{ dx: 0, dy: 0 }];
  const radius = 11 + count * 1.4;
  return Array.from({ length: count }, (_, i) => {
    const angle = (Math.PI * 2 * i) / count - Math.PI / 2;
    return { dx: Math.cos(angle) * radius, dy: Math.sin(angle) * radius };
  });
}
