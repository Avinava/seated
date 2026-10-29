import type { TableShape } from './types';

/** Table and seat dimensions in floor-plan units (1 unit = 1 CSS px at 100% zoom). */
export const GEOMETRY = {
  seat: 30,
  seatGap: 40,
  round: { diameter: 88, seatRadius: 68 },
  head: { depth: 44, seatOffset: 37 },
  long: { width: 50, seatOffset: 40 },
} as const;

export interface Point {
  readonly x: number;
  readonly y: number;
}

/** Size of the table top itself (not the seat ring). */
export function tableTop(shape: TableShape, seats: number, rotation: 0 | 90): { w: number; h: number } {
  switch (shape) {
    case 'round':
      return { w: GEOMETRY.round.diameter, h: GEOMETRY.round.diameter };
    case 'head':
      return { w: Math.max(80, seats * GEOMETRY.seatGap + 10), h: GEOMETRY.head.depth };
    case 'long': {
      const length = Math.max(80, (seats / 2) * GEOMETRY.seatGap + 4);
      return rotation === 90 ? { w: length, h: GEOMETRY.long.width } : { w: GEOMETRY.long.width, h: length };
    }
  }
}

/**
 * Seat centres relative to the table centre, in seat-index order.
 * Round tables start at twelve o'clock and go clockwise; head tables seat one
 * side, facing the room; long tables fill the left (or top) side, then the other.
 */
export function seatPositions(shape: TableShape, seats: number, rotation: 0 | 90): Point[] {
  const { seatGap } = GEOMETRY;
  switch (shape) {
    case 'round': {
      const r = GEOMETRY.round.seatRadius;
      return Array.from({ length: seats }, (_, i) => {
        const a = (i / seats) * 2 * Math.PI - Math.PI / 2;
        return { x: round(Math.cos(a) * r), y: round(Math.sin(a) * r) };
      });
    }
    case 'head': {
      const start = -((seats - 1) * seatGap) / 2;
      return Array.from({ length: seats }, (_, i) => ({ x: start + i * seatGap, y: -GEOMETRY.head.seatOffset }));
    }
    case 'long': {
      const perSide = Math.ceil(seats / 2);
      const start = -((perSide - 1) * seatGap) / 2;
      return Array.from({ length: seats }, (_, i) => {
        const side = i < perSide ? -1 : 1;
        const along = start + (i % perSide) * seatGap;
        const across = side * GEOMETRY.long.seatOffset;
        return rotation === 90 ? { x: along, y: across } : { x: across, y: along };
      });
    }
  }
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
