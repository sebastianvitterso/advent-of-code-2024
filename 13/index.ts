import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')
const testInput = `
Button A: X+94, Y+34
Button B: X+22, Y+67
Prize: X=8400, Y=5400

Button A: X+26, Y+66
Button B: X+67, Y+21
Prize: X=12748, Y=12176

Button A: X+17, Y+86
Button B: X+84, Y+37
Prize: X=7870, Y=6450

Button A: X+69, Y+23
Button B: X+27, Y+71
Prize: X=18641, Y=10279`.trim()

const clawMachineInputs = input.split('\n\n')

type Coordinate = {
  x: number
  y: number
}

class ClawMachine {
  private buttonAMovement: Coordinate
  private buttonBMovement: Coordinate
  private prizeLocation: Coordinate
  private static A_COST = 3
  private static B_COST = 1
  private static MAX_MOVES_PER_BUTTON = 100

  constructor(input: string, performAdjustment = false) {
    const [buttonAMovementLine, buttonBMovementLine, prizeLocationLine] = input.split('\n')
    if (buttonAMovementLine === undefined || buttonBMovementLine === undefined || prizeLocationLine === undefined) {
      throw new Error(`Invalid claw machine input: ${input}`)
    }
    this.buttonAMovement = ClawMachine.getMovementFromLine(buttonAMovementLine)
    this.buttonBMovement = ClawMachine.getMovementFromLine(buttonBMovementLine)
    this.prizeLocation = ClawMachine.getPrizeLocationFromLine(prizeLocationLine)

    // TODO: Consider moving this to a separate class, as the logic for finding combinations will need to be totally different for part 2
    if (performAdjustment) {
      this.prizeLocation = ClawMachine.adjustCoordinate(this.prizeLocation)
    }
  }

  private static getMovementFromLine(line: string): Coordinate {
    const x = Number.parseInt(line.match(/X([+-]\d+)/)?.[1] ?? 'nan')
    const y = Number.parseInt(line.match(/Y([+-]\d+)/)?.[1] ?? 'nan')
    if (Number.isNaN(x) || Number.isNaN(y)) throw new Error(`Invalid movement line: ${line}`)
    return { x, y }
  }

  private static getPrizeLocationFromLine(line: string): Coordinate {
    const x = Number.parseInt(line.match(/X=(\d+)/)?.[1] ?? 'nan')
    const y = Number.parseInt(line.match(/Y=(\d+)/)?.[1] ?? 'nan')
    if (Number.isNaN(x) || Number.isNaN(y)) throw new Error(`Invalid prize location line: ${line}`)
    return { x, y }
  }

  private static adjustCoordinate(coordinate: Coordinate): Coordinate {
    return {
      x: coordinate.x + 10000000000000,
      y: coordinate.y + 10000000000000,
    }
  }

  public findCheapestCombination(): { combination: { a: number; b: number }; cost: number } | null {
    const moveCombinations = this.findMoveCombinations()
    if (moveCombinations.length === 0) return null
    const { combination, cost } = moveCombinations.reduce(
      (cheapest, currentCombination) => {
        const currentCost = this.getCombinationCost(currentCombination.a, currentCombination.b)
        if (cheapest.cost <= currentCost) return cheapest
        return { combination: currentCombination, cost: currentCost }
      },
      {
        combination: { a: 0, b: 0 },
        cost: Number.POSITIVE_INFINITY,
      },
    )
    return { combination, cost }
  }

  public analyticallyFindCombinationCost(): { combination: { a: number; b: number }; cost: number } | null {
    const combination = this.analyticallyFindCombination()
    if (combination === null) return null
    return { combination, cost: this.getCombinationCost(combination.a, combination.b) }
  }

  public getCombinationCost(a: number, b: number): number {
    return a * ClawMachine.A_COST + b * ClawMachine.B_COST
  }

  private findMoveCombinations(): { a: number; b: number }[] {
    const moveCombinations: { a: number; b: number }[] = []
    for (let i = 0; i <= ClawMachine.MAX_MOVES_PER_BUTTON; i++) {
      for (let j = 0; j <= ClawMachine.MAX_MOVES_PER_BUTTON; j++) {
        if (this.testMoveCombination(i, j)) {
          moveCombinations.push({ a: i, b: j })
        }
      }
    }
    return moveCombinations
  }

  public testMoveCombination(a: number, b: number): boolean {
    const x = a * this.buttonAMovement.x + b * this.buttonBMovement.x
    const y = a * this.buttonAMovement.y + b * this.buttonBMovement.y
    return x === this.prizeLocation.x && y === this.prizeLocation.y
  }

  public analyticallyFindCombination(): { a: number; b: number } | null {
    const { x: aX, y: aY } = this.buttonAMovement
    const { x: bX, y: bY } = this.buttonBMovement
    const { x, y } = this.prizeLocation

    const bCount = (y * aX - x * aY) / (aX * bY - aY * bX)
    const aCount = (x - bCount * bX) / aX
    if (Number.isInteger(aCount) && Number.isInteger(bCount)) {
      return { a: aCount, b: bCount }
    }
    return null
  }
}

const clawMachines = clawMachineInputs.map((input) => new ClawMachine(input))

const cheapestMoves = clawMachines.map((clawMachine) => clawMachine.findCheapestCombination())
const totalCostForAvailablePrizes = cheapestMoves
  .filter((move) => move !== null)
  .reduce((totalCost, move) => totalCost + move.cost, 0)
console.log(totalCostForAvailablePrizes)

const adjustedClawMachines = clawMachineInputs.map((input) => new ClawMachine(input, true))
const adjustedCombinations = adjustedClawMachines.map((clawMachine) => clawMachine.analyticallyFindCombinationCost())

const totalCostForAdjustedPrizes = adjustedCombinations
  .filter((move) => move !== null)
  .reduce((totalCost, move) => totalCost + move.cost, 0)
console.log(totalCostForAdjustedPrizes)
