import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')

class Towel {
  constructor(public readonly pattern: string) {}
}

class TowelMemoization<T> {
  public readonly memoization: Map<string, T | null> = new Map()

  get(design: string): T | null {
    return this.memoization.get(design) ?? null
  }

  set(design: string, displays: T): void {
    this.memoization.set(design, displays)
  }
}
type DesignWithCurrent = `${string}:${string}`
class TowelMemoizationOld<T> {
  public readonly memoization: Map<DesignWithCurrent, T | null> = new Map()

  get(design: string, currentProgress: string): T | null {
    return this.memoization.get(`${design}:${currentProgress}`) ?? null
  }

  set(design: string, currentProgress: string, displays: T): void {
    this.memoization.set(`${design}:${currentProgress}`, displays)
  }
}
const towelMemoization = new TowelMemoization<Towel[][]>()
const towelObjectMemoization = new TowelMemoizationOld<Record<string, TowelDisplay>>()

class TowelDisplay {
  constructor(public readonly towels: Towel[]) {}

  static fromDesignAndTowels(design: string, towels: Towel[], ongoingDisplay: Towel[] = []): TowelDisplay | null {
    const ongoingDisplayString = ongoingDisplay.map((towel) => towel.pattern).join('')
    const remainingDesign = design.slice(ongoingDisplayString.length)
    if (remainingDesign.length === 0) return new TowelDisplay(ongoingDisplay)

    for (const towel of towels) {
      if (remainingDesign.startsWith(towel.pattern)) {
        const result = TowelDisplay.fromDesignAndTowels(design, towels, [...ongoingDisplay, towel])
        if (result !== null) return result
      }
    }

    return null
  }

  static findAllFromDesignAndTowels(remainingDesign: string, towels: Towel[]): Towel[][] {
    const memoized = towelMemoization.get(remainingDesign)
    if (memoized !== null) return memoized

    const displays: Towel[][] = []
    for (const towel of towels) {
      if (remainingDesign === towel.pattern) displays.push([towel])
      if (remainingDesign.startsWith(towel.pattern)) {
        const subPatterns = TowelDisplay.findAllFromDesignAndTowels(remainingDesign.slice(towel.pattern.length), towels)
        for (const subPattern of subPatterns) {
          displays.push([towel, ...subPattern])
        }
      }
    }
    towelMemoization.set(remainingDesign, displays)
    return displays
  }

  static findAllFromDesignAndTowelsOld(
    design: string,
    towels: Towel[],
    ongoingDisplay: Towel[] = [],
  ): Record<string, TowelDisplay> {
    const ongoingDisplayString = ongoingDisplay.map((towel) => towel.pattern).join('')
    const remainingDesign = design.slice(ongoingDisplayString.length)
    if (remainingDesign.length === 0) {
      console.log(ongoingDisplay.map((towel) => towel.pattern).join(' '))
      return { [ongoingDisplay.map((towel) => towel.pattern).join(' ')]: new TowelDisplay(ongoingDisplay) }
    }
    const memoized = towelObjectMemoization.get(design, ongoingDisplayString)
    if (memoized !== null) {
      console.log('Retrieved:', ongoingDisplayString, Object.values(memoized).length)
      return memoized
    }

    const displays: Record<string, TowelDisplay> = {}

    for (const towel of towels) {
      if (remainingDesign.startsWith(towel.pattern)) {
        const result = TowelDisplay.findAllFromDesignAndTowelsOld(design, towels, [...ongoingDisplay, towel])
        for (const [key, value] of Object.entries(result)) {
          displays[key] = value
        }
      }
    }
    towelObjectMemoization.set(design, ongoingDisplayString, displays)
    console.log('Stored:', ongoingDisplayString, Object.values(displays).length)
    return displays
  }
}

const [towelLine, designLines] = input.trim().split('\n\n')
if (towelLine === undefined || designLines === undefined) throw new Error('Invalid input')
const towels = towelLine.split(', ').map((pattern) => new Towel(pattern))
const designs = designLines.split('\n')

const towelDisplays = designs.map((design) => TowelDisplay.fromDesignAndTowels(design, towels))
const validTowelDisplays = towelDisplays.filter((display) => display !== null)
console.log(validTowelDisplays.length)

const allTowelDisplays = designs.map((design) =>
  TowelDisplay.findAllFromDesignAndTowels(design, towels).map((towelArray) => new TowelDisplay(towelArray)),
)
const validTowelDisplayCounts = allTowelDisplays.map((displays) => Object.values(displays).length)
console.log(validTowelDisplayCounts)
console.log(validTowelDisplayCounts.reduce((sum, count) => sum + count, 0))
