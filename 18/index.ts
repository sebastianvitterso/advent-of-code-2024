import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')

type XY = { x: number; y: number }
type XYString = `${number},${number}`
const stringToXY = (str: XYString): XY => {
  const [x, y] = str.split(',').map(Number)
  return { x, y } as XY
}
const xyToString = (xy: XY): XYString => `${xy.x},${xy.y}`

enum Direction {
  North = 'N',
  East = 'E',
  South = 'S',
  West = 'W',
}

const deltas: Record<Direction, XY> = {
  [Direction.North]: { x: 0, y: -1 },
  [Direction.East]: { x: 1, y: 0 },
  [Direction.South]: { x: 0, y: 1 },
  [Direction.West]: { x: -1, y: 0 },
}

class NoPathException extends Error {}
class MemoryMap {
  private width = 70
  private height = 70
  private corruptedBytes = new Set<XYString>()

  constructor(corruptedByteLocations: XY[]) {
    for (const { x, y } of corruptedByteLocations) {
      this.corruptedBytes.add(`${x},${y}`)
    }
  }

  public addCorruptedByte(x: number, y: number): void {
    this.corruptedBytes.add(`${x},${y}`)
  }

  private isViable(x: number, y: number): boolean {
    if (x < 0 || x > this.width) return false
    if (y < 0 || y > this.height) return false
    if (this.corruptedBytes.has(`${x},${y}`)) return false
    return true
  }

  public getViableNeighbors(x: number, y: number): XY[] {
    const viableNeighbors: XY[] = []
    for (const delta of Object.values(deltas)) {
      const newX = x + delta.x
      const newY = y + delta.y
      if (this.isViable(newX, newY)) {
        viableNeighbors.push({ x: newX, y: newY })
      }
    }
    return viableNeighbors
  }

  public print(withPath?: XY[], blockedBy?: XY): void {
    const red = '\x1b[31m'
    const green = '\x1b[32m'
    const reset = '\x1b[0m'

    const rows: string[][] = []
    for (let y = 0; y <= this.height; y++) {
      const row: string[] = []
      for (let x = 0; x <= this.width; x++) {
        if (this.corruptedBytes.has(`${x},${y}`)) {
          row.push('#')
        } else {
          row.push('.')
        }
      }
      rows.push(row)
    }
    for (const pathElement of withPath ?? []) {
      const row = rows[pathElement.y]
      if (!row) throw new Error('Row should be defined')
      row[pathElement.x] = `${green}O${reset}`
      if (blockedBy && pathElement.x === blockedBy.x && pathElement.y === blockedBy.y) {
        row[pathElement.x] = `${red}X${reset}`
        break
      }
    }
    console.log('\n')
    for (const row of rows) {
      console.log(row.join(''))
    }
  }

  public findShortestPath(start: XY, end: XY): XY[] {
    // dijkstra's algorithm
    const visited = new Set<XYString>()
    const predecessors: Record<XYString, XY | null> = {}
    const distances: Record<XYString, number> = {}
    const queue = new DumbPriorityQueue()

    for (let y = 0; y <= this.height; y++) {
      for (let x = 0; x <= this.width; x++) {
        if (this.corruptedBytes.has(`${x},${y}`)) continue
        distances[`${x},${y}`] = Number.POSITIVE_INFINITY
      }
    }

    distances[`${start.x},${start.y}`] = 0
    queue.add(start, 0)

    while (queue.size > 0) {
      const current = queue.pop()
      if (current === null) throw new Error('Queue should not be empty')
      if (current.x === end.x && current.y === end.y) {
        const path: XY[] = [current]
        let pathElement = current
        while (pathElement) {
          const predecessor = predecessors[xyToString(pathElement)]
          if (predecessor === null || predecessor === undefined) throw new Error('Predecessor should be defined')
          path.push(predecessor)
          pathElement = predecessor
          if (predecessor.x === start.x && predecessor.y === start.y) break
        }
        return path.reverse()
      }

      visited.add(xyToString(current))
      const currentDistance = distances[xyToString(current)]
      if (currentDistance === undefined) throw new Error('Distance should be defined')
      const neighbors = this.getViableNeighbors(current.x, current.y)

      const neighborDistance = currentDistance + 1
      for (const neighbor of neighbors) {
        const neighborString = xyToString(neighbor)
        if (visited.has(neighborString)) continue
        const currentNeighborDistance = distances[neighborString]
        if (currentNeighborDistance === undefined) throw new Error('Distance should be defined')
        if (neighborDistance < currentNeighborDistance) {
          distances[neighborString] = neighborDistance
          predecessors[neighborString] = current
          queue.add(neighbor, neighborDistance)
        }
      }
    }

    throw new NoPathException()
  }
}

type Bucket = Record<XYString, number>
class DumbPriorityQueue {
  private buckets: (Bucket | undefined)[] = []
  private static BUCKET_SIZE = 10
  private static getBucketIndex(priority: number): number {
    return Math.floor(priority / DumbPriorityQueue.BUCKET_SIZE)
  }

  public add(position: XY, priority: number): void {
    this.remove(position)
    const bucketIndex = DumbPriorityQueue.getBucketIndex(priority)
    if (!this.buckets[bucketIndex]) this.buckets[bucketIndex] = {}
    this.buckets[bucketIndex][xyToString(position)] = priority
  }

  public remove(position: XY): void {
    for (const bucket of this.buckets) {
      if (!bucket) continue
      delete bucket[xyToString(position)]
    }
  }

  public pop(): XY | null {
    for (const bucket of this.buckets) {
      if (!bucket) continue
      const bucketMinimum = DumbPriorityQueue.getBucketMinimum(bucket)
      if (bucketMinimum) {
        this.remove(bucketMinimum)
        return bucketMinimum
      }
    }
    return null
  }

  public static getBucketSize(bucket: Bucket): number {
    if (!bucket) return 0
    return Object.values(bucket).length
  }

  public getDebugStats(): Record<string, number> {
    const stats: Record<string, number> = {}
    for (const [index, bucket] of this.buckets.entries()) {
      stats[index] = bucket ? DumbPriorityQueue.getBucketSize(bucket) : 0
    }
    return stats
  }

  public static getBucketMinimum(bucket: Bucket): XY | null {
    let lowestPriority = Number.POSITIVE_INFINITY
    let lowestXyDirection: XYString | null = null
    for (const [positionString, priority] of Object.entries(bucket)) {
      if (priority < lowestPriority) {
        lowestPriority = priority
        lowestXyDirection = positionString as XYString
      }
    }
    return lowestXyDirection ? stringToXY(lowestXyDirection) : null
  }

  public get size(): number {
    return this.buckets.reduce((acc, bucket) => acc + Object.values(bucket ?? {}).length, 0)
  }
}

const corruptedByteLocations = input
  .split('\n')
  .map((line) => line.split(',').map(Number))
  .map(([x, y]) => ({ x, y })) as XY[]
const memoryMap = new MemoryMap(corruptedByteLocations.slice(0, 1024))

let shortestPath = memoryMap.findShortestPath({ x: 0, y: 0 }, { x: 70, y: 70 })
// memoryMap.print(shortestPath)
console.log(shortestPath.length - 1)

function pathToCellSet(path: XY[]): Set<XYString> {
  const pathCells = new Set<XYString>()
  for (const cell of path) {
    pathCells.add(xyToString(cell))
  }
  return pathCells
}

let previousPathCells: Set<XYString> | null = null
const memoryMap2 = new MemoryMap([])
for (const corruptedByteLocation of corruptedByteLocations) {
  memoryMap2.addCorruptedByte(corruptedByteLocation.x, corruptedByteLocation.y)
  // no point checking if the corrupted byte is not part of the previous successful path, since it will not affect the path
  if (previousPathCells && !previousPathCells.has(xyToString(corruptedByteLocation))) continue
  try {
    shortestPath = memoryMap2.findShortestPath({ x: 0, y: 0 }, { x: 70, y: 70 })
    previousPathCells = pathToCellSet(shortestPath)
    // memoryMap2.print(shortestPath)
  } catch (e) {
    if (e instanceof NoPathException) {
      console.log('No path found', corruptedByteLocation)
      // memoryMap2.print(shortestPath, corruptedByteLocation)
      break
    }
  }
}
