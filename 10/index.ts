import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')
// const input = `
// ..90..9
// ...1.98
// ...2..7
// 6543456
// 765.987
// 876....
// 987....`.trim()

enum CardinalDirection {
  North = 'N',
  East = 'E',
  South = 'S',
  West = 'W',
}

const DirectionDeltas: Record<CardinalDirection, [number, number]> = {
  [CardinalDirection.North]: [0, -1],
  [CardinalDirection.East]: [1, 0],
  [CardinalDirection.South]: [0, 1],
  [CardinalDirection.West]: [-1, 0],
}

class TopographicalMap {
  private map: number[][]

  constructor(input: string) {
    this.map = input.split('\n').map((line) => line.split('').map((char) => Number.parseInt(char)))
  }

  get width(): number {
    return this.map[0]?.length ?? 0
  }
  get height(): number {
    return this.map.length
  }

  public get(x: number, y: number): number | undefined {
    return this.map[y]?.[x]
  }

  public getTrailHeadPositions(): [number, number][] {
    const positions: [number, number][] = []
    for (let y = 0; y < this.map.length; y++) {
      for (let x = 0; x < (this.map[y]?.length ?? 0); x++) {
        if (this.get(x, y) === 0) {
          positions.push([x, y])
        }
      }
    }
    return positions
  }

  public getTrails(): Trail[] {
    return this.getTrailHeadPositions().flatMap((position) => Trail.fromPartialTrail(this, [position]))
  }
  public getTrailsByUniqueHeadsAndTails(): Trail[] {
    const trails = this.getTrailHeadPositions().flatMap((position) => Trail.fromPartialTrail(this, [position]))

    // set of trails with unique heads and tails
    const trailSet = new Map<string, Trail>()
    for (const trail of trails) {
      const head = trail.positions[0]
      const tail = trail.positions.at(-1)
      if (head === undefined || tail === undefined) throw new Error('Unexpected undefined head or tail')
      const key = `${head.join(',')} -> ${tail.join(',')}`
      if (!trailSet.has(key)) {
        trailSet.set(key, trail)
      }
    }
    return Array.from(trailSet.values())
  }
}

class Trail {
  constructor(
    public positions: [number, number][],
    private map: TopographicalMap,
  ) {
    // validation!
    if (positions.length !== 10) throw new Error(`Unexpected trail length, should be 10, was ${positions.length}.`)
    for (let i = 0; i <= 9; i++) {
      const position = positions[i]
      if (position === undefined) throw new Error(`Unexpected undefined position at index ${i}`)
      const [x, y] = position
      const value = map.get(x, y)
      if (value === undefined || value !== i) throw new Error(`Unexpected value at position ${i}: ${value}`)
    }
  }

  public static fromPartialTrail(map: TopographicalMap, partialTrail: [number, number][]): Trail[] {
    const positions = [...partialTrail]
    const lastPosition = positions[positions.length - 1]
    if (lastPosition === undefined) throw new Error('Unexpected undefined last position')
    const lastValue = map.get(lastPosition[0], lastPosition[1])
    if (lastValue === undefined) throw new Error('Unexpected undefined last value')
    if (lastValue === 9) return [new Trail(positions, map)]

    const trails: Trail[] = []
    for (const direction of Object.values(CardinalDirection)) {
      const [dx, dy] = DirectionDeltas[direction]
      const [x, y] = [lastPosition[0] + dx, lastPosition[1] + dy]
      if (map.get(x, y) === lastValue + 1) {
        trails.push(...Trail.fromPartialTrail(map, [...positions, [x, y]]))
      }
    }
    return trails
  }

  public visualize(): void {
    const blankCanvas = Array.from({ length: this.map.height }, () => Array.from({ length: this.map.width }, () => '•'))
    for (const position of this.positions) {
      const [x, y] = position
      if (blankCanvas[y] === undefined) throw new Error(`Unexpected undefined at y=${y}`)
      blankCanvas[y][x] = this.map.get(x, y)?.toString() ?? '?'
    }
    const canvas = blankCanvas.map((row) => row.join('')).join('\n')
    console.log(canvas)
    console.log('\n')
  }
}

const map = new TopographicalMap(input)
const uniqueHeadAndTailTrails = map.getTrailsByUniqueHeadsAndTails()
console.log(uniqueHeadAndTailTrails.length)

const allTrails = map.getTrails()
console.log(allTrails.length)
