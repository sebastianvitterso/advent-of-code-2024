import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')

class AntennaMap {
  public map: string[][]
  constructor(input: string) {
    this.map = input.split('\n').map((line) => line.split(''))
  }

  public get(x: number, y: number): string | undefined {
    return this.map[x]?.[y]
  }

  public get height(): number {
    return this.map[0]?.length ?? 0
  }
  public get width(): number {
    return this.map.length
  }

  private getFrequencySortedAntennaLocations(): Record<string, [number, number][]> {
    const frequencySortedAntennaLocations: Record<string, [number, number][]> = {}

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        const value = this.get(x, y)
        if (value === undefined || value === '.') continue
        if (!frequencySortedAntennaLocations[value]) {
          frequencySortedAntennaLocations[value] = []
        }
        frequencySortedAntennaLocations[value].push([x, y])
      }
    }

    return frequencySortedAntennaLocations
  }

  public getInitialAntinodeLocations(): [number, number][] {
    const frequencySortedAntennaLocations = this.getFrequencySortedAntennaLocations()

    const antinodeLocations: Set<string> = new Set()
    for (const [_frequency, locations] of Object.entries(frequencySortedAntennaLocations)) {
      for (let i = 0; i < locations.length; i++) {
        for (let j = i + 1; j < locations.length; j++) {
          const firstLocation = locations[i]
          const secondLocation = locations[j]
          if (firstLocation === undefined || secondLocation === undefined) throw new Error('This should not happen')
          const [x1, y1] = firstLocation
          const [x2, y2] = secondLocation

          if (x1 === x2 && y1 === y2) continue
          const dx = x2 - x1
          const dy = y2 - y1

          const xFirstAntinode = x1 - dx
          const yFirstAntinode = y1 - dy
          if (this.get(xFirstAntinode, yFirstAntinode) !== undefined) {
            antinodeLocations.add(`${xFirstAntinode},${yFirstAntinode}`)
          }
          const xSecondAntinode = x2 + dx
          const ySecondAntinode = y2 + dy
          if (this.get(xSecondAntinode, ySecondAntinode) !== undefined) {
            antinodeLocations.add(`${xSecondAntinode},${ySecondAntinode}`)
          }
        }
      }
    }

    return Array.from(antinodeLocations).map(
      (location) => location.split(',').map((value) => Number.parseInt(value)) as [number, number],
    )
  }

  public getInfiniteAntinodeLocations(): [number, number][] {
    const frequencySortedAntennaLocations = this.getFrequencySortedAntennaLocations()

    const antinodeLocations: Set<string> = new Set()
    for (const [_frequency, locations] of Object.entries(frequencySortedAntennaLocations)) {
      for (let i = 0; i < locations.length; i++) {
        for (let j = i + 1; j < locations.length; j++) {
          const firstLocation = locations[i]
          const secondLocation = locations[j]
          if (firstLocation === undefined || secondLocation === undefined) throw new Error('This should not happen')
          const [x1, y1] = firstLocation
          const [x2, y2] = secondLocation

          if (x1 === x2 && y1 === y2) continue
          const dx = x2 - x1
          const dy = y2 - y1

          let xNegativeDirectionAntinodes = x1
          let yNegativeDirectionAntinodes = y1
          while (this.get(xNegativeDirectionAntinodes, yNegativeDirectionAntinodes) !== undefined) {
            antinodeLocations.add(`${xNegativeDirectionAntinodes},${yNegativeDirectionAntinodes}`)
            xNegativeDirectionAntinodes -= dx
            yNegativeDirectionAntinodes -= dy
          }

          let xPositiveDirectionAntinodes = x2
          let yPositiveDirectionAntinodes = y2
          while (this.get(xPositiveDirectionAntinodes, yPositiveDirectionAntinodes) !== undefined) {
            antinodeLocations.add(`${xPositiveDirectionAntinodes},${yPositiveDirectionAntinodes}`)
            xPositiveDirectionAntinodes += dx
            yPositiveDirectionAntinodes += dy
          }
        }
      }
    }

    return Array.from(antinodeLocations).map(
      (location) => location.split(',').map((value) => Number.parseInt(value)) as [number, number],
    )
  }
}

const antennaMap = new AntennaMap(input)
const initialAntinodeLocations = antennaMap.getInitialAntinodeLocations()
console.log(initialAntinodeLocations.length)

const infiniteAntinodeLocations = antennaMap.getInfiniteAntinodeLocations()
console.log(infiniteAntinodeLocations.length)
