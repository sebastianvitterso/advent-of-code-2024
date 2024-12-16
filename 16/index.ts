import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')

enum Direction {
  NORTH = '^',
  EAST = '>',
  SOUTH = 'v',
  WEST = '<',
}
type XY = { x: number; y: number }
type XYDirection = { x: number; y: number; direction: Direction }
type dXY = { dx: number; dy: number }
type StringXY = `${number},${number}`
type StringXYDirection = `${number},${number},${Direction}`
const xyString = (xy: XY): StringXY => `${xy.x},${xy.y}` as StringXY
const xyDirectionString = (xyDir: XYDirection): StringXYDirection =>
  `${xyDir.x},${xyDir.y},${xyDir.direction}` as StringXYDirection
const stringToXY = (string: StringXY): XY => {
  const [x, y] = string.split(',').map(Number)
  if (x === undefined || y === undefined) throw new Error('Invalid string coordinate')
  return { x, y }
}
const stringToXYDirection = (string: StringXYDirection): XYDirection => {
  const [x, y, direction] = string.split(',')
  if (x === undefined || y === undefined || direction === undefined) throw new Error('Invalid string coordinate')
  if (!Object.values(Direction).includes(direction as Direction)) throw new Error('Invalid direction')
  return { x: Number(x), y: Number(y), direction: direction as Direction }
}

const nextDirectionMap: Record<Direction, { right: Direction; left: Direction }> = {
  [Direction.NORTH]: { right: Direction.EAST, left: Direction.WEST },
  [Direction.EAST]: { right: Direction.SOUTH, left: Direction.NORTH },
  [Direction.SOUTH]: { right: Direction.WEST, left: Direction.EAST },
  [Direction.WEST]: { right: Direction.NORTH, left: Direction.SOUTH },
}

const directionDxyMap: Record<Direction, dXY> = {
  [Direction.NORTH]: { dx: 0, dy: -1 },
  [Direction.EAST]: { dx: 1, dy: 0 },
  [Direction.SOUTH]: { dx: 0, dy: 1 },
  [Direction.WEST]: { dx: -1, dy: 0 },
}

const dxyDirectionMap: Record<string, Direction> = {
  '0,-1': Direction.NORTH,
  '1,0': Direction.EAST,
  '0,1': Direction.SOUTH,
  '-1,0': Direction.WEST,
}

class Reindeer {
  constructor(
    public position: XY,
    public direction: Direction,
  ) {}
}

class MazeMap {
  public walls: Set<StringXY> = new Set()
  public freeSpaces: Set<StringXY> = new Set()
  public freeSpaceCoordinates: Set<XY> = new Set()
  public reindeer: Reindeer
  public finish: XY

  constructor(private map: string[][]) {
    this.reindeer = new Reindeer({ x: -1, y: -1 }, Direction.EAST)
    this.finish = { x: -1, y: -1 }
    for (const [y, row] of this.map.entries()) {
      for (const [x, cell] of row.entries()) {
        if (cell === '#') {
          this.walls.add(`${x},${y}`)
        } else {
          this.freeSpaces.add(`${x},${y}`)
          this.freeSpaceCoordinates.add({ x, y })
        }

        if (cell === 'S') {
          this.reindeer = new Reindeer({ x, y }, Direction.EAST)
        }
        if (cell === 'E') {
          this.finish = { x, y }
        }
      }
    }
    if (this.reindeer.position.x === -1) throw new Error('Reindeer not found')
    if (this.finish.x === -1) throw new Error('Finish not found')
  }

  public isFreeSpace(x: number, y: number): boolean {
    return this.freeSpaces.has(`${x},${y}`)
  }
}

const map = new MazeMap(input.split('\n').map((row) => row.split('')))

type Bucket = Record<StringXYDirection, number>
class DumbPriorityQueue {
  private buckets: (Bucket | undefined)[] = []
  private static BUCKET_SIZE = 100
  private static getBucketIndex(priority: number): number {
    return Math.floor(priority / DumbPriorityQueue.BUCKET_SIZE)
  }

  public add(position: XYDirection, priority: number): void {
    this.remove(position)
    const bucketIndex = DumbPriorityQueue.getBucketIndex(priority)
    if (!this.buckets[bucketIndex]) this.buckets[bucketIndex] = {}
    this.buckets[bucketIndex][xyDirectionString(position)] = priority
  }

  public remove(position: XYDirection): void {
    for (const bucket of this.buckets) {
      if (!bucket) continue
      delete bucket[xyDirectionString(position)]
    }
  }

  public pop(): XYDirection | null {
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

  public static getBucketMinimum(bucket: Bucket): XYDirection | null {
    let lowestPriority = Number.POSITIVE_INFINITY
    let lowestXyDirection: StringXYDirection | null = null
    for (const [positionString, priority] of Object.entries(bucket)) {
      if (priority < lowestPriority) {
        lowestPriority = priority
        lowestXyDirection = positionString as StringXYDirection
      }
    }
    return lowestXyDirection ? stringToXYDirection(lowestXyDirection) : null
  }

  public get size(): number {
    return this.buckets.reduce((acc, bucket) => acc + Object.values(bucket ?? {}).length, 0)
  }
}

function dijkstraSearch(initialPosition: XY, initialDirection: Direction) {
  const predecessor: Record<StringXYDirection, StringXYDirection[]> = {}
  const distances: Record<StringXYDirection, number> = {}
  for (const freeSpace of map.freeSpaceCoordinates) {
    for (const direction of Object.values(Direction)) {
      distances[xyDirectionString({ ...freeSpace, direction })] = Number.POSITIVE_INFINITY
    }
  }

  const queue = new DumbPriorityQueue()
  const visited: Set<StringXYDirection> = new Set()

  type Neighbors = {
    forward: XYDirection | null
    turnLeft: XYDirection | null
    turnRight: XYDirection | null
  }

  const getNeighbors = (xyDirection: XYDirection): Neighbors => {
    const neighbors: Neighbors = { forward: null, turnLeft: null, turnRight: null }
    const { left, right } = nextDirectionMap[xyDirection.direction]
    const forwardDelta = directionDxyMap[xyDirection.direction]
    neighbors.forward = { ...xyDirection, x: xyDirection.x + forwardDelta.dx, y: xyDirection.y + forwardDelta.dy }
    neighbors.turnLeft = { ...xyDirection, direction: left }
    neighbors.turnRight = { ...xyDirection, direction: right }
    return neighbors
  }

  const totalCount = map.freeSpaceCoordinates.size * 4
  const logProgress = (): void => {
    // console.log(`${(visited.size / totalCount) * 100}% (visited=${visited.size}/${totalCount}, queue=${queue.size})`)
    console.log(`${Math.floor((visited.size / totalCount) * 100)}% of map explored`)
  }

  // initial step
  distances[xyDirectionString({ ...initialPosition, direction: initialDirection })] = 0
  queue.add({ ...initialPosition, direction: initialDirection }, 0)

  while (queue.size > 0) {
    if (visited.size % 1000 === 0) {
      logProgress()
    }
    const position = queue.pop()
    if (position === null) throw new Error('Position is null')

    const positionDirectionString = xyDirectionString(position)
    visited.add(positionDirectionString)

    const distance = distances[positionDirectionString]
    if (distance === undefined) throw new Error('Distance is undefined')

    if (position.x === map.finish.x && position.y === map.finish.y) {
      console.log(`Finish found, distance=${distance}`)
      break
    }

    const { forward, turnLeft, turnRight } = getNeighbors(position)
    if (forward && map.isFreeSpace(forward.x, forward.y)) {
      const forwardString = xyDirectionString(forward)
      const forwardDistance = distance + 1

      if (forwardDistance < (distances[forwardString] ?? Number.POSITIVE_INFINITY)) {
        distances[forwardString] = forwardDistance
        predecessor[forwardString] = [positionDirectionString]
      } else if (forwardDistance === (distances[forwardString] ?? Number.POSITIVE_INFINITY)) {
        predecessor[forwardString] = [...(predecessor[forwardString] ?? []), positionDirectionString]
      }
      if (!visited.has(forwardString)) {
        queue.add(forward, forwardDistance)
      }
    }
    for (const turn of [turnLeft, turnRight]) {
      if (turn === null) continue
      if (!map.isFreeSpace(turn.x, turn.y)) continue
      const turnString = xyDirectionString(turn)
      const turnDistance = distance + 1000
      if (turnDistance < (distances[turnString] ?? Number.POSITIVE_INFINITY)) {
        distances[turnString] = turnDistance
        predecessor[turnString] = [positionDirectionString]
      } else if (turnDistance === (distances[turnString] ?? Number.POSITIVE_INFINITY)) {
        predecessor[turnString] = [...(predecessor[turnString] ?? []), positionDirectionString]
      }
      if (!visited.has(turnString)) {
        queue.add(turn, turnDistance)
      }
    }
  }

  let shortestFinishDistance = Number.POSITIVE_INFINITY
  let shortestFinishFinalDirection: Direction | null = null
  for (const direction of Object.values(Direction)) {
    const finishDistance = distances[xyDirectionString({ x: map.finish.x, y: map.finish.y, direction })]
    if (finishDistance === undefined) throw new Error('Finish distance is undefined')
    if (finishDistance < shortestFinishDistance) {
      shortestFinishDistance = finishDistance
      shortestFinishFinalDirection = direction
    }
  }
  if (!shortestFinishFinalDirection) {
    throw new Error('Shortest finish final direction is null, so we did not find the finish.')
  }
  console.log('Shortest finish distance', shortestFinishDistance)

  const backtrack = (position: XYDirection): XYDirection[][] => {
    if (position.x === map.reindeer.position.x && position.y === map.reindeer.position.y) return [[position]]
    const positionString = xyDirectionString(position)
    const predecessors = predecessor[positionString]
    if (!predecessors) throw new Error('Predecessors is undefined')
    const paths: XYDirection[][] = []
    for (const predecessorString of predecessors) {
      const predecessorPosition = stringToXYDirection(predecessorString)
      const subPaths = backtrack(predecessorPosition)
      for (const subPath of subPaths) {
        paths.push([...subPath, position])
      }
    }
    return paths
  }

  const paths: XYDirection[][] = backtrack({
    x: map.finish.x,
    y: map.finish.y,
    direction: shortestFinishFinalDirection,
  })

  const tilesInShortestPaths: Set<StringXY> = new Set()
  for (const path of paths) {
    for (const { x, y } of path) {
      tilesInShortestPaths.add(`${x},${y}`)
    }
  }
  console.log('Unique tiles in shortest paths:', tilesInShortestPaths.size)
}

dijkstraSearch(map.reindeer.position, map.reindeer.direction)
