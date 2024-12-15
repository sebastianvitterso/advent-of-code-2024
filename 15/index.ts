import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')
const testInput = `
########
#..O.O.#
##@.O..#
#...O..#
#.#.O..#
#...O..#
#......#
########

<^^>>>vv<v>>v<<`.trim()

type XY = { x: number; y: number }
type dXY = { dx: number; dy: number }

enum Direction {
  North = 'N',
  South = 'S',
  East = 'E',
  West = 'W',
}
const directionDeltas: Record<Direction, dXY> = {
  [Direction.North]: { dx: 0, dy: -1 },
  [Direction.South]: { dx: 0, dy: 1 },
  [Direction.East]: { dx: 1, dy: 0 },
  [Direction.West]: { dx: -1, dy: 0 },
}
const isHorizontal = (direction: Direction) => direction === Direction.East || direction === Direction.West

enum MapEntity {
  Wall = '#',
  Box = 'O',
  Robot = '@',
  Empty = '.',
}

enum WideMapEntity {
  Wall = '#',
  BoxLeft = '[',
  BoxRight = ']',
  Robot = '@',
  Empty = '.',
}

class WarehouseMap {
  private robotPosition: XY

  constructor(private map: MapEntity[][]) {
    this.robotPosition = { x: -1, y: -1 }
    for (const [y, row] of map.entries()) {
      for (const [x, entity] of row.entries()) {
        if (entity === MapEntity.Robot) {
          this.robotPosition = { x, y }
        }
      }
    }
    if (this.robotPosition.x === -1) throw new Error('Robot not found')
  }

  moveRobot(direction: Direction) {
    const success = this.attemptToPush(this.robotPosition, direction)
    if (success) {
      const { dx, dy } = directionDeltas[direction]
      this.robotPosition.x += dx
      this.robotPosition.y += dy
    }
  }

  public set(x: number, y: number, entity: MapEntity) {
    const row = this.map[y]
    if (row === undefined) throw new Error('Row out of bounds')
    if (row[x] === undefined) throw new Error('Column out of bounds')
    row[x] = entity
  }

  public get(x: number, y: number): MapEntity {
    const row = this.map[y]
    if (row === undefined) throw new Error('Row out of bounds')
    const entity = row[x]
    if (entity === undefined) throw new Error('Column out of bounds')
    return entity
  }

  attemptToPush(from: XY, direction: Direction): boolean {
    const { dx, dy } = directionDeltas[direction]
    const to = { x: from.x + dx, y: from.y + dy }
    const sourceEntity = this.get(from.x, from.y)
    let targetEntity = this.get(to.x, to.y)

    switch (targetEntity) {
      case MapEntity.Robot:
        throw new Error('Should not be able to find multiple robots in map')
      case MapEntity.Wall:
        return false
      case MapEntity.Box: {
        if (!this.attemptToPush(to, direction)) return false
        targetEntity = this.get(to.x, to.y)
        if (this.get(to.x, to.y) !== MapEntity.Empty)
          throw new Error(`Invalid state: ${to.x},${to.y}=${this.get(to.x, to.y)}`)
        this.set(to.x, to.y, sourceEntity)
        this.set(from.x, from.y, targetEntity)
        return true
      }
      case MapEntity.Empty:
        this.set(to.x, to.y, sourceEntity)
        this.set(from.x, from.y, targetEntity)
        return true
    }
  }

  print() {
    for (const row of this.map) {
      console.log(row.join(''))
    }
  }

  getBoxCount(): number {
    let count = 0
    for (const row of this.map) {
      for (const entity of row) {
        if (entity === MapEntity.Box) {
          count++
        }
      }
    }
    return count
  }

  getGpsCoordinateScoreSum(): number {
    let sum = 0
    for (const [y, row] of this.map.entries()) {
      for (const [x, entity] of row.entries()) {
        if (entity === MapEntity.Box) {
          sum += x + 100 * y
        }
      }
    }
    return sum
  }
}

class WideWarehouseMap {
  private robotPosition: XY

  constructor(private map: WideMapEntity[][]) {
    this.robotPosition = { x: -1, y: -1 }
    for (const [y, row] of map.entries()) {
      for (const [x, entity] of row.entries()) {
        if (entity === WideMapEntity.Robot) {
          this.robotPosition = { x, y }
        }
      }
    }
    if (this.robotPosition.x === -1) throw new Error('Robot not found')
  }

  moveRobot(direction: Direction) {
    if (this.canPush(this.robotPosition, direction)) {
      this.push(this.robotPosition, direction)
      const { dx, dy } = directionDeltas[direction]
      this.robotPosition.x += dx
      this.robotPosition.y += dy
    }
  }

  public set(x: number, y: number, entity: WideMapEntity) {
    const row = this.map[y]
    if (row === undefined) throw new Error('Row out of bounds')
    if (row[x] === undefined) throw new Error('Column out of bounds')
    row[x] = entity
  }

  public get(x: number, y: number): WideMapEntity {
    const row = this.map[y]
    if (row === undefined) throw new Error('Row out of bounds')
    const entity = row[x]
    if (entity === undefined) throw new Error('Column out of bounds')
    return entity
  }

  canPush(from: XY, direction: Direction): boolean {
    const { dx, dy } = directionDeltas[direction]
    const to = { x: from.x + dx, y: from.y + dy }
    const targetEntity = this.get(to.x, to.y)
    switch (targetEntity) {
      case WideMapEntity.Robot:
        throw new Error('Should not be able to find multiple robots in map')
      case WideMapEntity.Wall:
        return false
      case WideMapEntity.BoxLeft:
      case WideMapEntity.BoxRight: {
        if (isHorizontal(direction)) {
          return this.canPush(to, direction)
        }
        const boxLeftCoordinate = targetEntity === WideMapEntity.BoxLeft ? to : { x: to.x - 1, y: to.y }
        const boxRightCoordinate = targetEntity === WideMapEntity.BoxRight ? to : { x: to.x + 1, y: to.y }
        return this.canPush(boxLeftCoordinate, direction) && this.canPush(boxRightCoordinate, direction)
      }
      case WideMapEntity.Empty:
        return true
    }
  }

  push(from: XY, direction: Direction): void {
    const sourceEntity = this.get(from.x, from.y)
    const { dx, dy } = directionDeltas[direction]
    const to = { x: from.x + dx, y: from.y + dy }
    let targetEntity = this.get(to.x, to.y)

    switch (targetEntity) {
      case WideMapEntity.Robot:
        throw new Error('Should not be able to find multiple robots in map')
      case WideMapEntity.Wall:
        throw new Error('Cannot push anything into a wall')
      case WideMapEntity.BoxLeft:
      case WideMapEntity.BoxRight: {
        if (isHorizontal(direction)) {
          this.push(to, direction)
        } else {
          const boxLeftCoordinate = targetEntity === WideMapEntity.BoxLeft ? to : { x: to.x - 1, y: to.y }
          const boxRightCoordinate = targetEntity === WideMapEntity.BoxRight ? to : { x: to.x + 1, y: to.y }
          this.push(boxLeftCoordinate, direction)
          this.push(boxRightCoordinate, direction)
        }
        targetEntity = this.get(to.x, to.y)
        if (targetEntity !== WideMapEntity.Empty) throw new Error(`Invalid state: ${to.x},${to.y}=${targetEntity}`)
        this.set(to.x, to.y, sourceEntity)
        this.set(from.x, from.y, targetEntity)
        return
      }
      case WideMapEntity.Empty:
        this.set(to.x, to.y, sourceEntity)
        this.set(from.x, from.y, targetEntity)
        return
    }
  }

  print() {
    for (const row of this.map) {
      console.log(row.join(''))
    }
  }

  getBoxCount(): number {
    let count = 0
    for (const row of this.map) {
      for (const entity of row) {
        if (entity === WideMapEntity.BoxLeft) {
          count++
        }
      }
    }
    return count
  }

  getGpsCoordinateScoreSum(): number {
    let sum = 0
    for (const [y, row] of this.map.entries()) {
      for (const [x, entity] of row.entries()) {
        if (entity === WideMapEntity.BoxLeft) {
          sum += x + 100 * y
        }
      }
    }
    return sum
  }
}

const [mapInput, moveInput] = input.split('\n\n')
if (mapInput === undefined || moveInput === undefined) throw new Error('Invalid input')
const moves = moveInput
  .trim()
  .replaceAll('\n', '')
  .split('')
  .map((move) => {
    switch (move) {
      case '^':
        return Direction.North
      case '>':
        return Direction.East
      case 'v':
        return Direction.South
      case '<':
        return Direction.West
      default:
        throw new Error(`Invalid move ${JSON.stringify(move)}`)
    }
  })

const entities = mapInput.split('\n').map((row) => row.split('')) as MapEntity[][]
const map = new WarehouseMap(entities)

map.print()
for (const move of moves) {
  map.moveRobot(move)
}
map.print()
console.log(map.getGpsCoordinateScoreSum())

const wideEntities = mapInput.split('\n').map((row) =>
  row.split('').flatMap((character) => {
    if (character === MapEntity.Box) return [WideMapEntity.BoxLeft, WideMapEntity.BoxRight]
    if (character === MapEntity.Robot) return [WideMapEntity.Robot, WideMapEntity.Empty]
    return [character, character]
  }),
) as WideMapEntity[][]

const wideMap = new WideWarehouseMap(wideEntities)
wideMap.print()
for (const move of moves) {
  wideMap.moveRobot(move)
}
wideMap.print()
console.log(wideMap.getGpsCoordinateScoreSum())
