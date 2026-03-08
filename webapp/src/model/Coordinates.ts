export function toXYZ(row: number, col: number, size:number) {
    const x = size - 1 - row;
    const y = col;
    const z = row - col;
    return { x, y, z };
}

export function fromXYZ(x: number, y: number, z: number, size: number) {
  const row = size - 1 - x;
  const col = y;

  return { row, col };
}