import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')

function transpose2DArray<T>(array: T[][]): T[][] {
  if (array[0] === undefined) return array
  // biome-ignore lint/style/noNonNullAssertion: Jeg får jo index'en fra array[0]
  return array[0].map((_, i) => array.map((row) => row[i]!))
}

type Position = { x: number; y: number }

enum CardinalDirection {
  North = 'North',
  East = 'East',
  South = 'South',
  West = 'West',
}

enum MapCell {
  Empty = '.',
  Obstacle = '#',
  GuardUp = '^',
  GuardRight = '>',
  GuardDown = 'v',
  GuardLeft = '<',
  OutsideMap = '',
}

class LoopError extends Error {}

class PositionDirectionLog {
  private positionLog: Set<string> = new Set()
  private positionAndDirectionLog: Set<string> = new Set()

  public add(position: Position, direction: CardinalDirection): void {
    this.positionLog.add(`${position.x},${position.y}`)
    this.positionAndDirectionLog.add(`${position.x},${position.y},${direction}`)
  }

  public hasBeenAtPositionAndDirection(position: Position, direction: CardinalDirection): boolean {
    return this.positionAndDirectionLog.has(`${position.x},${position.y},${direction}`)
  }

  public getUniquePositionCount(): number {
    return this.positionLog.size
  }

  public getUniquePositionAndDirectionCount(): number {
    return this.positionAndDirectionLog.size
  }
}

class LabMap {
  map: MapCell[][]
  guardPosition: Position
  guardDirection: CardinalDirection
  mapSize: { width: number; height: number }
  guardPositionLog: PositionDirectionLog = new PositionDirectionLog()

  constructor(input: string) {
    const mapLines = input.split('\n').map((line) => line.split(''))
    const firstLine = mapLines[0]
    if (!firstLine) throw new Error('Invalid input')
    this.mapSize = { width: firstLine.length, height: mapLines.length }

    // Transponert så jeg kan skrive map[x][y] i stedet for map[y][x].
    this.map = transpose2DArray(mapLines) as MapCell[][]
    ;[this.guardPosition, this.guardDirection] = LabMap.getGuardPositionAndDirection(this.map)
  }

  private static getGuardPositionAndDirection(map: MapCell[][]): [Position, CardinalDirection] {
    for (let x = 0; x < map.length; x++) {
      if (map[x] === undefined) throw new Error('Invalid map')
      // biome-ignore lint/style/noNonNullAssertion: Denne regelen er dust
      for (let y = 0; y < map[x]!.length; y++) {
        const cell = map[x]?.[y]
        if (cell === undefined) throw new Error('Invalid map')

        if (cell === MapCell.GuardUp) return [{ x, y }, CardinalDirection.North]
        if (cell === MapCell.GuardRight) return [{ x, y }, CardinalDirection.East]
        if (cell === MapCell.GuardDown) return [{ x, y }, CardinalDirection.South]
        if (cell === MapCell.GuardLeft) return [{ x, y }, CardinalDirection.West]
      }
    }
    throw new Error('No guard found')
  }

  private getCell(position: Position): MapCell {
    const cell = this.map[position.x]?.[position.y]
    if (cell === undefined) return MapCell.OutsideMap
    return cell
  }

  private static getNextPosition(position: Position, direction: CardinalDirection): Position {
    switch (direction) {
      case CardinalDirection.North:
        return { x: position.x, y: position.y - 1 }
      case CardinalDirection.East:
        return { x: position.x + 1, y: position.y }
      case CardinalDirection.South:
        return { x: position.x, y: position.y + 1 }
      case CardinalDirection.West:
        return { x: position.x - 1, y: position.y }
      default:
        throw new Error('Invalid direction')
    }
  }

  private static getNextDirection(direction: CardinalDirection): CardinalDirection {
    switch (direction) {
      case CardinalDirection.North:
        return CardinalDirection.East
      case CardinalDirection.East:
        return CardinalDirection.South
      case CardinalDirection.South:
        return CardinalDirection.West
      case CardinalDirection.West:
        return CardinalDirection.North
      default:
        throw new Error('Invalid direction')
    }
  }

  public moveGuard(throwIfLooped = false): void {
    this.guardPositionLog.add(this.guardPosition, this.guardDirection)

    const nextPosition = LabMap.getNextPosition(this.guardPosition, this.guardDirection)
    if (this.getCell(nextPosition) === MapCell.Obstacle) {
      // Hvis det er en vegg foran, snu 90 grader til høyre og prøv igjen
      this.guardDirection = LabMap.getNextDirection(this.guardDirection)
      this.moveGuard(throwIfLooped)
      return
    }
    this.guardPosition = nextPosition
    if (throwIfLooped && this.guardPositionLog.hasBeenAtPositionAndDirection(this.guardPosition, this.guardDirection)) {
      throw new LoopError()
    }
  }

  public guardIsOnMap(): boolean {
    return this.getCell(this.guardPosition) !== MapCell.OutsideMap
  }
}

const labMap = new LabMap(input)
while (labMap.guardIsOnMap()) {
  labMap.moveGuard()
}
console.log(labMap.guardPositionLog.getUniquePositionCount())

// Denne delen tar litt tid
let loopCounter = 0
for (let x = 0; x < labMap.mapSize.width; x++) {
  for (let y = 0; y < labMap.mapSize.height; y++) {
    const trialMap = new LabMap(input)
    // biome-ignore lint/style/noNonNullAssertion: Trust me bro
    trialMap.map[x]![y] = MapCell.Obstacle
    try {
      while (trialMap.guardIsOnMap()) {
        trialMap.moveGuard(true)
      }
    } catch (e) {
      if (e instanceof LoopError) {
        loopCounter++
        continue
      }
      throw e
    }
  }
}
console.log(loopCounter)
