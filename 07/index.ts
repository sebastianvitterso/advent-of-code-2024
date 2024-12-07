import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')

const rawEquations: [number, number[]][] = input
  .trim()
  .split('\n')
  .map((line) => {
    const [first, rest] = line.split(':')
    if (first === undefined || rest === undefined) {
      throw new Error('Invalid input')
    }
    const answer = Number.parseInt(first)
    const numbers = rest.trim().split(' ').map(Number)
    return [answer, numbers] as [number, number[]]
  })

enum Operator {
  ADD = '+',
  MULTIPLY = '*',
  CONCATENATE = '||',
}

class UnfinishedEquation {
  constructor(
    private answer: number,
    private numbers: number[],
    private operators: Operator[] = [],
  ) {}

  public recursivelyAttemptUntilMatch(givenOperators: Operator[]): number | undefined {
    if (this.canBeCalculated()) {
      const result = this.calculate()
      if (result === this.answer) {
        return result
      }
      return undefined
    }

    for (const operator of givenOperators) {
      const subEquation = new UnfinishedEquation(this.answer, this.numbers, [...this.operators, operator])
      const subResult = subEquation.recursivelyAttemptUntilMatch(givenOperators)
      if (subResult !== undefined) {
        return subResult
      }
    }
    return undefined
  }

  protected canBeCalculated(): boolean {
    return this.numbers.length === this.operators.length + 1
  }

  protected calculate(): number {
    if (!this.canBeCalculated()) throw new Error('Cannot calculate yet')
    let result = this.numbers[0]
    if (result === undefined) throw new Error('The first number was undefined, somehow...')
    for (let i = 0; i < this.operators.length; i++) {
      const number = this.numbers[i + 1]
      if (number === undefined) throw new Error('Too few numbers, somehow...')
      switch (this.operators[i]) {
        case Operator.ADD:
          result += number
          break
        case Operator.MULTIPLY:
          result *= number
          break
        case Operator.CONCATENATE:
          result = Number.parseInt(`${result}${number}`)
          break
      }
    }
    return result
  }
}

const unfinishedEquations = rawEquations.map(([answer, numbers]) => new UnfinishedEquation(answer, numbers))

const sumOfAddMultiply = unfinishedEquations
  .map((equation) => equation.recursivelyAttemptUntilMatch([Operator.ADD, Operator.MULTIPLY]))
  .filter((result) => result !== undefined)
  .reduce((acc, result) => acc + result, 0)

console.log(sumOfAddMultiply)

const sumOfAddMultiplyConcatenate = unfinishedEquations
  .map((equation) => equation.recursivelyAttemptUntilMatch([Operator.ADD, Operator.MULTIPLY, Operator.CONCATENATE]))
  .filter((result) => result !== undefined)
  .reduce((acc, result) => acc + result, 0)

console.log(sumOfAddMultiplyConcatenate)
