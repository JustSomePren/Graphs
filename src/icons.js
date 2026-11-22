// Jednoduché linkové ikony (24×24, tah 1,75) místo emoji
const PATHS = {
  back: 'M15 5l-7 7 7 7',
  next: 'M9 5l7 7-7 7',
  pencil: 'M4 20l4-1 11-11-3-3L5 16l-1 4zM14 6l3 3',
  dots: 'M5 17l5-6 4 3 5-8M5 17h.01M10 11h.01M14 14h.01M19 6h.01',
  hand: 'M5 12l3-3 3 3V4h2v8l4-1 2 2-6 7H9L5 12z',
  expand: 'M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5',
  undo: 'M9 7L4 12l5 5M4 12h11a5 5 0 010 10h-3',
  close: 'M6 6l12 12M18 6L6 18',
  band: 'M3 12c4 0 6-6 18-7M3 12c4 0 6 6 18 7M3 12h18',
  reset: 'M4 4v6h6M20 20v-6h-6M5 15a7 7 0 0012 3M19 9A7 7 0 007 6',
  zoom: 'M12 3v18M8 7l4-4 4 4M8 17l4 4 4-4',
  stats: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  gear: 'M12 15a3 3 0 100-6 3 3 0 000 6zM19 12l2-1-1-3-2 .5-1.5-1.5L17 5l-3-1-1 2h-2l-1-2-3 1 .5 2L6 8.5 4 8l-1 3 2 1v1l-2 1 1 3 2-.5L7.5 17 7 19l3 1 1-2h2l1 2 3-1-.5-2 1.5-1.5 2 .5 1-3-2-1z',
  share: 'M12 15V3M7 8l5-5 5 5M5 13v7h14v-7',
  calendar: 'M4 6h16v14H4zM4 10h16M8 3v5M16 3v5',
  check: 'M5 12l5 5 9-10',
  layers: 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5',
  flag: 'M5 21V4h11l-2 4 2 4H5',
  shuffle: 'M4 7h4l8 10h4M4 17h4l2.5-3M14 10l2-3h4M17 4l3 3-3 3M17 14l3 3-3 3',
  book: 'M4 5a2 2 0 012-2h13v16H6a2 2 0 00-2 2V5zM4 19a2 2 0 012-2h13',
}

export function icon(name, label) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svg.setAttribute('viewBox', '0 0 24 24')
  svg.setAttribute('class', 'icon')
  svg.setAttribute('aria-hidden', label ? 'false' : 'true')
  svg.innerHTML = `<path d="${PATHS[name]}" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"/>`
  return svg
}
