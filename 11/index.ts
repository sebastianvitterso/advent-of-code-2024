import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = (await readFile(`${dirname}/input.txt`, 'utf-8')).split(' ').map(Number)

class StoneLine {
  constructor(private stones: number[]) {}

  public blink(): StoneLine {
    return new StoneLine(
      this.stones.flatMap((stone) => {
        if (stone === 0) return [1]
        const stringifiedStoneNumber = String(stone)
        if (stringifiedStoneNumber.length % 2 === 0) {
          const firstStone = Number.parseInt(stringifiedStoneNumber.slice(0, stringifiedStoneNumber.length / 2))
          const secondStone = Number.parseInt(stringifiedStoneNumber.slice(stringifiedStoneNumber.length / 2))
          return [firstStone, secondStone]
        }
        return [stone * 2024]
      }),
    )
  }

  public get stoneCount(): number {
    return this.stones.length
  }
}

let stoneLine = new StoneLine(input)
console.log(`Initial: ${stoneLine.stoneCount}`)
for (let i = 0; i < 25; i++) {
  stoneLine = stoneLine.blink()
  console.log(`Blink ${i + 1}: ${stoneLine.stoneCount}`)
}

console.log('Trying more efficient methods!')
class EfficientStoneLine {
  constructor(private stones: Record<string, number>) {}

  public blink(): EfficientStoneLine {
    const newStones: Record<string, number> = {}
    for (const [stoneStr, count] of Object.entries(this.stones)) {
      const stone = Number(stoneStr)
      if (stone === 0) {
        newStones[1] = (newStones[1] ?? 0) + count
        continue
      }
      const stringifiedStoneNumber = String(stone)
      if (stringifiedStoneNumber.length % 2 === 0) {
        const firstStone = Number.parseInt(stringifiedStoneNumber.slice(0, stringifiedStoneNumber.length / 2))
        const secondStone = Number.parseInt(stringifiedStoneNumber.slice(stringifiedStoneNumber.length / 2))
        newStones[firstStone] = (newStones[firstStone] ?? 0) + count
        newStones[secondStone] = (newStones[secondStone] ?? 0) + count
        continue
      }
      newStones[stone * 2024] = (newStones[stone * 2024] ?? 0) + count
    }
    return new EfficientStoneLine(newStones)
  }

  public get stoneCount(): number {
    return Object.values(this.stones).reduce((total, count) => total + count, 0)
  }
}

const initialStones = input.reduce(
  (stoneCountsByType, stone) => {
    stoneCountsByType[stone] = (stoneCountsByType[stone] ?? 0) + 1
    return stoneCountsByType
  },
  {} as Record<string, number>,
)
let efficientStoneLine = new EfficientStoneLine(initialStones)
console.log(`Initial: ${efficientStoneLine.stoneCount}`)
for (let i = 0; i < 75; i++) {
  efficientStoneLine = efficientStoneLine.blink()
  console.log(`Blink ${i + 1}: ${efficientStoneLine.stoneCount}`)
}
