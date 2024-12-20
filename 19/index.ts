import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')

class Towel {
  constructor(public readonly pattern: string) {}
}

type DesignWithCurrent = `${string}:${string}`
class TowelMemoization {
  public readonly memoization: Map<DesignWithCurrent, Set<TowelDisplay> | null> = new Map()

  get(design: string, currentProgress: string): Set<TowelDisplay> | null {
    return this.memoization.get(`${design}:${currentProgress}`) ?? null
  }

  set(design: string, currentProgress: string, displays: Set<TowelDisplay>): void {
    this.memoization.set(`${design}:${currentProgress}`, displays)
  }
}
const towelMemoization = new TowelMemoization()

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

  static findAllFromDesignAndTowels(design: string, towels: Towel[], ongoingDisplay: Towel[] = []): Set<TowelDisplay> {
    const ongoingDisplayString = ongoingDisplay.map((towel) => towel.pattern).join('')
    const remainingDesign = design.slice(ongoingDisplayString.length)
    if (remainingDesign.length === 0) return new Set([new TowelDisplay(ongoingDisplay)])
    const memoized = towelMemoization.get(design, ongoingDisplayString)
    if (memoized !== null) return memoized

    // const displays: Set<TowelDisplay> = new Set()
    let displays: Set<TowelDisplay> = new Set()

    for (const towel of towels) {
      if (remainingDesign.startsWith(towel.pattern)) {
        const result = TowelDisplay.findAllFromDesignAndTowels(design, towels, [...ongoingDisplay, towel])
        displays = displays.union(result)
      }
    }
    towelMemoization.set(design, ongoingDisplayString, displays)
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
const allTowelDisplays = designs.map((design) => TowelDisplay.findAllFromDesignAndTowels(design, towels))
const validTowelDisplayCounts = allTowelDisplays.map((displays) => displays.size)
console.log(validTowelDisplayCounts)
console.log(validTowelDisplayCounts.reduce((sum, count) => sum + count, 0))
