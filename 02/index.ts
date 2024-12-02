import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const lines = (await readFile(`${dirname}/input.txt`, 'utf-8')).split('\n')

class Report {
  constructor(private levels: number[]) {}

  public isSafe(): boolean {
    return (this.isStrictlyIncreasing() || this.isStrictlyDecreasing()) && this.hasSafeLeaps()
  }

  private isStrictlyIncreasing(): boolean {
    return this.levels.every((level, i, levels) => i === 0 || level > (levels[i - 1] ?? Number.POSITIVE_INFINITY))
  }

  private isStrictlyDecreasing(): boolean {
    return this.levels.every((level, i, levels) => i === 0 || level < (levels[i - 1] ?? Number.NEGATIVE_INFINITY))
  }

  private hasSafeLeaps(): boolean {
    const leapMax = 3
    return this.levels.every((level, i, levels) => i === 0 || Math.abs(level - (levels[i - 1] ?? 0)) <= leapMax)
  }

  public isSafeGivenProblemDampener(): boolean {
    return this.getProblemDampenedReports().some((report) => report.isSafe())
  }

  public getProblemDampenedReports(): Report[] {
    console.log(this.levels)
    const dampenedReports: Report[] = []
    for (let i = 0; i < this.levels.length; i++) {
      const dampenedLevels = this.levels.toSpliced(i, 1)
      dampenedReports.push(new Report(dampenedLevels))
    }
    return dampenedReports
  }
}

const reports = lines.map((line) => line.split(' ').map(Number)).map((levels) => new Report(levels))
console.log({
  totalReports: reports.length,
  safeReports: reports.filter((report) => report.isSafe()).length,
  safeReportsGivenProblemDampener: reports.filter((report) => report.isSafeGivenProblemDampener()).length,
})
