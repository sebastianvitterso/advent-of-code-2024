import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ffmpeg from 'fluent-ffmpeg'
import { Jimp, ResizeStrategy, loadFont } from 'jimp'
import { SANS_32_WHITE } from 'jimp/fonts'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')

type XY = { x: number; y: number }

const MAP_WIDTH = 101
const MAP_HEIGHT = 103

function modulo(n: number, m: number) {
  // JS's modulo operator is not the same as the mathematical modulo operator,
  // it returns a negative number if the dividend is negative, which is stupid
  return ((n % m) + 10_000 * m) % m
}

class Robot {
  constructor(
    public position: XY,
    public velocity: XY,
  ) {}

  static fromString(input: string) {
    const [px, py, vx, vy] = input.match(/-?\d+/g)?.map(Number) ?? []
    if (px === undefined || py === undefined || vx === undefined || vy === undefined) {
      throw new Error('Invalid input')
    }
    return new Robot({ x: px, y: py }, { x: vx, y: vy })
  }

  public move(stepsAtATime = 1) {
    this.position.x = modulo(this.position.x + this.velocity.x * stepsAtATime, MAP_WIDTH)
    this.position.y = modulo(this.position.y + this.velocity.y * stepsAtATime, MAP_HEIGHT)
  }
}

class Rectangle {
  constructor(
    public topLeft: XY,
    public bottomRight: XY,
  ) {}
  public contains(point: XY) {
    return (
      this.topLeft.x <= point.x &&
      this.topLeft.y <= point.y &&
      this.bottomRight.x > point.x &&
      this.bottomRight.y > point.y
    )
  }
}

class RobotMap {
  constructor(public robots: Robot[]) {}

  public move(stepsAtATime = 1) {
    for (const robot of this.robots) {
      robot.move(stepsAtATime)
    }
  }

  get quadrants(): [Rectangle, Rectangle, Rectangle, Rectangle] {
    const topLeft = new Rectangle({ x: 0, y: 0 }, { x: Math.floor(MAP_WIDTH / 2), y: Math.floor(MAP_HEIGHT / 2) })
    const topRight = new Rectangle(
      { x: Math.ceil(MAP_WIDTH / 2), y: 0 },
      { x: MAP_WIDTH, y: Math.floor(MAP_HEIGHT / 2) },
    )
    const bottomLeft = new Rectangle(
      { x: 0, y: Math.ceil(MAP_HEIGHT / 2) },
      { x: Math.floor(MAP_WIDTH / 2), y: MAP_HEIGHT },
    )
    const bottomRight = new Rectangle(
      { x: Math.ceil(MAP_WIDTH / 2), y: Math.ceil(MAP_HEIGHT / 2) },
      { x: MAP_WIDTH, y: MAP_HEIGHT },
    )
    return [topLeft, topRight, bottomLeft, bottomRight]
  }
  public getRobotsInQuadrants(): [Robot[], Robot[], Robot[], Robot[]] {
    const robotsInQuadrants: [Robot[], Robot[], Robot[], Robot[]] = [[], [], [], []]
    for (const robot of this.robots) {
      for (const [qIndex, quadrant] of this.quadrants.entries()) {
        if (quadrant.contains(robot.position)) {
          robotsInQuadrants[qIndex]?.push(robot)
        }
      }
    }
    return robotsInQuadrants
  }

  public getSecurityFactor(): number {
    const robotsInQuadrants = this.getRobotsInQuadrants()
    return robotsInQuadrants.reduce((acc, robots) => acc * robots.length, 1)
  }

  public getMap(): number[][] {
    const map = Array.from({ length: MAP_HEIGHT }, () => Array.from({ length: MAP_WIDTH }, () => 0))
    for (const robot of this.robots) {
      const row = map[robot.position.y]
      if (row === undefined) throw new Error('Invalid row')
      row[robot.position.x] = (row[robot.position.x] ?? 0) + 1
    }
    return map
  }

  public async printMap(timestep: number): Promise<void> {
    const map = this.getMap()
    // if (!blobInside2DArray(map, 10)) return
    // const mapString = map.map((row) => row.map((cell) => (cell ? cell.toString() : '.')).join('')).join('\n')
    // await writeFile(`${dirname}/output/${String(timestep).padStart(4, '0')}.txt`, mapString, { encoding: 'utf-8' })
    const filepath = `${dirname}/outputImg/${String(timestep).padStart(4, '0')}.png`
    const mapPixelColors = map.map((row) => row.map((cell) => (cell ? 0x00ff00ff : 0x000000ff)))
    const image = new Jimp({
      height: MAP_HEIGHT,
      width: MAP_WIDTH,
      color: 0x00000000,
      // data: Buffer.from(mapPixelColors.flat()),
    })
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        image.setPixelColor(mapPixelColors[y]?.[x] ?? 0, x, y)
      }
    }
    image.scale({ f: 5, mode: ResizeStrategy.NEAREST_NEIGHBOR })
    image.print({ font: await loadFont(SANS_32_WHITE), x: 0, y: 0, text: `${timestep}` })
    await image.write(`${dirname}/output/${String(timestep).padStart(4, '0')}.png`)
    console.log(`Wrote ${filepath}`)
  }
}

function blobInside2DArray(array: number[][], blobMinSize: number): boolean {
  const linear = array.map((row) => row.map((value) => (value ? '#' : '.')).join('')).join('')
  const blob = '#'.repeat(blobMinSize)
  return linear.includes(blob)
}

async function fileExists(path: string): Promise<boolean> {
  try {
    await stat(path)
    return true
  } catch {
    return false
  }
}

const robots = input.split('\n').map(Robot.fromString)
const robotMap = new RobotMap(robots)
robotMap.move(100)
console.log(robotMap.getSecurityFactor())

const robots2 = input.split('\n').map(Robot.fromString)
const robotMap2 = new RobotMap(robots2)
await robotMap2.printMap(0)
for (let i = 1; i < 10_000; i++) {
  robotMap2.move()
  await robotMap2.printMap(i)
}

console.log('Writing video')
ffmpeg().addInput(`${dirname}/output/%04d.png`).inputFPS(30).output(`${dirname}/output.mp4`).run()
