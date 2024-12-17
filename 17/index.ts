import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')
const testInput = `
Register A: 729
Register B: 0
Register C: 0

Program: 0,1,5,4,3,0`.trim()

// OPCODES:
// 0 - adv (truncated division of A / 2^combo, written to A)
// 1 - bxl (bitwise XOR of B and literal, written to B)
// 2 - bst (combo % 8, written to B)
// 3 - jnz (NOP if A is 0, otherwise jump to literal)
// 4 - bxc (bitwise XOR of B and C, written to B (ignores literal/combo))
// 5 - out (combo % 8, written to output)
// 6 - bdv (truncated division of A / 2^combo, written to B)
// 7 - cdv (truncated division of A / 2^combo, written to C)

// COMBO OPERANDS:
// 0 - Litral 0
// 1 - Literal 1
// 2 - Literal 2
// 3 - Literal 3
// 4 - Register A value
// 5 - Register B value
// 6 - Register C value
// 7 - SHOULD NOT BE USED (throw error?)

type Opcode = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7
type Operand = 0 | 1 | 2 | 3 | 4 | 5 | 6

class JumpOperation {
  constructor(public target: number) {}
}

class ProgramEndException extends Error {}

class Computer {
  private output: number[] = []
  private pointer = 0

  constructor(
    private a: number,
    private b: number,
    private c: number,
    private program: number[],
  ) {}

  private runOneCycle() {
    const opcode = this.program[this.pointer] as Opcode | undefined
    const operand = this.program[this.pointer + 1] as Operand | undefined
    if (opcode === undefined || operand === undefined) throw new ProgramEndException()
    const jump = this.runOperation(opcode, operand)
    if (jump instanceof JumpOperation) {
      this.pointer = jump.target
    } else {
      this.pointer += 2
    }
  }

  public runProgram() {
    while (true) {
      try {
        computer.runOneCycle()
      } catch (e) {
        if (e instanceof ProgramEndException) break
        throw e
      }
    }
  }

  public getOutput(): string {
    return this.output.join(',')
  }

  public getNumericOutput(): number[] {
    return this.output
  }

  private runOperation(opcode: Opcode, operand: Operand): JumpOperation | undefined {
    switch (opcode) {
      case 0:
        return this.adv(operand)
      case 1:
        return this.bxl(operand)
      case 2:
        return this.bst(operand)
      case 3:
        return this.jnz(operand)
      case 4:
        return this.bxc(operand)
      case 5:
        return this.out(operand)
      case 6:
        return this.bdv(operand)
      case 7:
        return this.cdv(operand)
      default:
        throw new Error(`Invalid opcode: ${opcode}`)
    }
  }

  private getCombo(operand: Operand) {
    switch (operand) {
      case 0:
        return 0
      case 1:
        return 1
      case 2:
        return 2
      case 3:
        return 3
      case 4:
        return this.a
      case 5:
        return this.b
      case 6:
        return this.c
      default:
        throw new Error('Invalid operand')
    }
  }

  private adv(operand: Operand): undefined {
    const combo = this.getCombo(operand)
    this.a = Math.floor(this.a / 2 ** combo)
  }

  private bxl(operand: Operand): undefined {
    this.b = this.b ^ operand
  }

  private bst(operand: Operand): undefined {
    const combo = this.getCombo(operand)
    // modulo in js isn't predictable for negative numbers,
    // so we add 8 and modulo twice to ensure positive value
    this.b = combo % 8
  }

  private jnz(operand: Operand): JumpOperation | undefined {
    if (this.a === 0) return undefined
    return new JumpOperation(operand)
  }

  private bxc(operand: Operand): undefined {
    this.b = this.b ^ this.c
  }

  private out(operand: Operand): undefined {
    const combo = this.getCombo(operand)
    this.output.push(combo % 8)
  }

  private bdv(operand: Operand): undefined {
    const combo = this.getCombo(operand)
    this.b = Math.floor(this.a / 2 ** combo)
  }

  private cdv(operand: Operand): undefined {
    const combo = this.getCombo(operand)
    this.c = Math.floor(this.a / 2 ** combo)
  }
}

const [aLine, bLine, cLine, _, programLine] = input.trim().split('\n')
const aInitial = Number.parseInt(aLine?.split(' ')[2] ?? '')
const bInitial = Number.parseInt(bLine?.split(' ')[2] ?? '')
const cInitial = Number.parseInt(cLine?.split(' ')[2] ?? '')
if (Number.isNaN(aInitial) || Number.isNaN(bInitial) || Number.isNaN(cInitial)) {
  throw new Error('Invalid initial values')
}
const program = programLine?.split(' ')[1]?.split(',').map(Number)
if (program === undefined) throw new Error('Invalid program')

const computer = new Computer(aInitial, bInitial, cInitial, program)
computer.runProgram()
console.log(computer.getOutput())

function equalArrays(a: number[], b: number[]): boolean {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// let i = 0
// while (true) {
//   if (i % 100_000 === 0) console.log(i)
//   const computer = new Computer(i, bInitial, cInitial, program)
//   computer.runProgram()
//   const numericOutput = computer.getNumericOutput()
//   if (equalArrays(numericOutput, program)) {
//     console.log(i)
//     break
//   }
//   i++
// }

function div(a: number, b: number): number {
  return Math.floor(a / b)
}

function getOutputForByteValue(initialA: number): number[] {
  let a = initialA
  const output: number[] = []
  while (a !== 0) {
    output.push(((a % 8) ^ 4 ^ div(a, 2 ** ((a % 8) ^ 4)) ^ 4) % 8)
    a = div(a, 8)
  }
  return output
}

function getByteNumber(byteArray: number[]): number {
  let number = 0
  for (const [index, byte] of byteArray.entries()) {
    number += byte * 8 ** (byteArray.length - index - 1)
  }
  console.log(number)
  return number
}

function findMatch(): number[] {
  if (!program) throw new Error('No program')
  const bytes: number[] = []
  while (true) {
    let matchFound = false
    for (let i = 0; i < 8; i++) {
      const testBytes = [...bytes, i]
      const testNumber = getByteNumber(testBytes)
      const testOutput = getOutputForByteValue(testNumber)
      if (equalArrays(testOutput, program.slice(0, Math.max(testOutput.length, 1)))) {
        console.log(testOutput)
        if (testOutput.length === program.length) {
          console.log('FOUND MATCH:', testBytes)
          return testBytes
        }
        console.log(testNumber)
        matchFound = true
        bytes.push(i)
        break
      }
    }
    if (!matchFound) throw new Error(`No match found, bytes: ${bytes}`)
  }
}

const match = findMatch()
console.log(getByteNumber(match))
