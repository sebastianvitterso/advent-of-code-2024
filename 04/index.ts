import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')

enum CardinalDirection {
  N = 'N',
  NE = 'NE',
  E = 'E',
  SE = 'SE',
  S = 'S',
  SW = 'SW',
  W = 'W',
  NW = 'NW',
}

const directions: Record<CardinalDirection, [number, number]> = {
  [CardinalDirection.N]: [0, -1],
  [CardinalDirection.NE]: [1, -1],
  [CardinalDirection.E]: [1, 0],
  [CardinalDirection.SE]: [1, 1],
  [CardinalDirection.S]: [0, 1],
  [CardinalDirection.SW]: [-1, 1],
  [CardinalDirection.W]: [-1, 0],
  [CardinalDirection.NW]: [-1, -1],
}

class WordSearch {
  constructor(private input: string) {}

  private get grid(): string[][] {
    return this.input.split('\n').map((line) => line.split(''))
  }

  public findXMASCount(): number {
    const xIndices: [number, number][] = []
    for (const [i, row] of this.grid.entries()) {
      for (const [j, char] of row.entries()) {
        if (char.toLocaleUpperCase() === 'X') {
          xIndices.push([i, j])
        }
      }
    }

    let count = 0
    for (const [i, j] of xIndices) {
      for (const direction of Object.values(CardinalDirection)) {
        if (this.checkDirectionForXMAS([i, j], direction)) {
          count++
        }
      }
    }
    return count
  }

  private checkDirectionForXMAS(startIndex: [number, number], direction: CardinalDirection): boolean {
    const [i, j] = startIndex
    const [di, dj] = directions[direction]

    // this first check should always be true, given that we're starting at an X
    if (this.grid[i]?.[j] !== 'X') return false
    if (this.grid[i + 1 * di]?.[j + 1 * dj] !== 'M') return false
    if (this.grid[i + 2 * di]?.[j + 2 * dj] !== 'A') return false
    if (this.grid[i + 3 * di]?.[j + 3 * dj] !== 'S') return false
    return true
  }

  public findXShapedMASCount(): number {
    const aIndices: [number, number][] = []
    for (const [i, row] of this.grid.entries()) {
      for (const [j, char] of row.entries()) {
        if (char.toLocaleUpperCase() === 'A') {
          aIndices.push([i, j])
        }
      }
    }

    let count = 0
    for (const [i, j] of aIndices) {
      const foundDirections: CardinalDirection[] = []
      for (const direction of [
        CardinalDirection.NE,
        CardinalDirection.SE,
        CardinalDirection.SW,
        CardinalDirection.NW,
      ]) {
        if (this.checkDirectionForXShapedMAS([i, j], direction)) {
          foundDirections.push(direction)
        }
      }
      if (foundDirections.length === 2) {
        count++
      }
    }
    return count
  }

  private checkDirectionForXShapedMAS(startIndex: [number, number], direction: CardinalDirection): boolean {
    const [i, j] = startIndex
    const [di, dj] = directions[direction]

    // this first check should always be true, given that we're starting at an A
    if (this.grid[i]?.[j] !== 'A') return false
    if (this.grid[i - di]?.[j - dj] !== 'M') return false
    if (this.grid[i + di]?.[j + dj] !== 'S') return false
    return true
  }
}

const wordSearch = new WordSearch(input)
console.log(wordSearch.findXMASCount())
console.log(wordSearch.findXShapedMASCount())
