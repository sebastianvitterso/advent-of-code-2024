import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')
const testInput = `
AAAAAA
AAABBA
AAABBA
ABBAAA
ABBAAA
AAAAAA`

const grid = testInput
  .trim()
  .split('\n')
  .map((row) => row.split(''))

class GardenMap {
  constructor(public grid: string[][]) {}

  public getRegions(): Region[] {
    const plots = this.grid.flatMap((row, y) => row.map((value, x) => new Plot(x, y, value)))
    const regionBuilders = new Set<RegionBuilder>()
    for (const plot of plots) {
      const matchingBuilders: RegionBuilder[] = []
      for (const regionBuilder of regionBuilders) {
        if (regionBuilder.crop === plot.crop && regionBuilder.currentlyNeighbors(plot)) {
          matchingBuilders.push(regionBuilder)
        }
      }
      if (matchingBuilders.length === 0) {
        const newRegionBuilder = new RegionBuilder(plot.crop)
        newRegionBuilder.addPlot(plot)
        regionBuilders.add(newRegionBuilder)
        continue
      }

      const firstBuilder = matchingBuilders[0]
      if (firstBuilder === undefined) throw new Error('Unexpected undefined builder')
      if (matchingBuilders.length > 1) {
        for (const matchingBuilder of matchingBuilders.slice(1)) {
          firstBuilder.merge(matchingBuilder)
          regionBuilders.delete(matchingBuilder)
        }
      }
      firstBuilder.addPlot(plot)
    }

    return Array.from(regionBuilders).map((builder) => builder.build())
  }
}

class RegionBuilder {
  private plots: Plot[] = []
  constructor(public readonly crop: string) {}

  public currentlyNeighbors(plot: Plot): boolean {
    for (const regionPlot of this.plots) {
      if (regionPlot.isNeighbor(plot)) return true
    }
    return false
  }

  public addPlot(plot: Plot): void {
    this.plots.push(plot)
  }

  public merge(region: RegionBuilder): void {
    for (const plot of region.plots) {
      this.addPlot(plot)
    }
  }

  public build(): Region {
    return new Region(this.plots, this.crop)
  }
}

class Region {
  constructor(
    public plots: Plot[],
    public crop: string,
  ) {}

  getArea(): number {
    return this.plots.length
  }

  getFenceSections(): FenceSection[] {
    const allFences = new Set<string>()
    const fencesToKeep: Record<string, FenceSection> = {}
    for (const plot of this.plots) {
      for (const fenceSection of plot.perimeterFenceSections) {
        if (allFences.has(fenceSection.toString())) {
          delete fencesToKeep[fenceSection.toString()]
          continue
        }

        allFences.add(fenceSection.toString())
        fencesToKeep[fenceSection.toString()] = fenceSection
      }
    }
    return Object.values(fencesToKeep)
  }

  getPerimeterLength(): number {
    return this.getFenceSections().length
  }

  getFenceSegments(): FenceSegment[] {
    const fenceSections = this.getFenceSections()
    const fenceSegmentBuilders = new Set<FenceSegmentBuilder>()
    for (const fenceSection of fenceSections) {
      const matchingBuilders: FenceSegmentBuilder[] = []
      for (const fenceSegmentBuilder of fenceSegmentBuilders) {
        if (fenceSegmentBuilder.shouldContain(fenceSection)) {
          matchingBuilders.push(fenceSegmentBuilder)
        }
      }
      if (matchingBuilders.length === 0) {
        const newFenceSegmentBuilder = new FenceSegmentBuilder(
          fenceSection.direction,
          fenceSection.direction === FenceDirection.HORIZONTAL ? fenceSection.y : fenceSection.x,
        )
        newFenceSegmentBuilder.addFenceSection(fenceSection)
        fenceSegmentBuilders.add(newFenceSegmentBuilder)
        continue
      }

      const firstBuilder = matchingBuilders[0]
      if (firstBuilder === undefined) throw new Error('Unexpected undefined builder')
      if (matchingBuilders.length > 1) {
        for (const matchingBuilder of matchingBuilders.slice(1)) {
          firstBuilder.merge(matchingBuilder)
          fenceSegmentBuilders.delete(matchingBuilder)
        }
      }
      firstBuilder.addFenceSection(fenceSection)
    }
    return Array.from(fenceSegmentBuilders).map((builder) => builder.build())
  }

  getFenceCost(): number {
    return this.getArea() * this.getPerimeterLength()
  }

  getFenceCostWithBulkDiscount(): number {
    const fenceSegments = this.getFenceSegments()
    console.log(
      `Fence segments for ${this.crop}:`,
      fenceSegments.map((segment) => `${segment.direction} ${segment.index} (${segment.getLength()})`),
    )
    return this.getArea() * fenceSegments.length
  }

  public toString(): string {
    return `${this.crop} region, ${this.plots.length} plots. Fence cost: ${this.getFenceCost()}`
  }
}

class Plot {
  constructor(
    public x: number,
    public y: number,
    public crop: string,
  ) {}

  toString(): string {
    return `${this.crop} (${this.x},${this.y})`
  }

  static fromString(string: string): Plot {
    const match = string.match(/(\w) \((\d+),(\d+)\)/)
    if (!match) throw new Error(`Invalid plot string: ${string}`)
    const [, value, x, y] = match
    if (!value || !x || !y) throw new Error(`Invalid plot string: ${string}`)
    return new Plot(Number.parseInt(x), Number.parseInt(y), value)
  }

  public isNeighbor(plot: Plot): boolean {
    if (this.x === plot.x && Math.abs(this.y - plot.y) === 1) return true
    if (this.y === plot.y && Math.abs(this.x - plot.x) === 1) return true
    return false
  }

  /**
   * Perimeter coordinates lie between plot coordinates, as fences.
   * So for a plot at (0,0), the perimeter coordinates are: (0,0), (1,0), (0,1), (1,1)
   */
  get perimeterFenceSections(): FenceSection[] {
    return [
      new FenceSection(FenceDirection.VERTICAL, this.x, this.y),
      new FenceSection(FenceDirection.VERTICAL, this.x + 1, this.y),
      new FenceSection(FenceDirection.HORIZONTAL, this.x, this.y),
      new FenceSection(FenceDirection.HORIZONTAL, this.x, this.y + 1),
    ]
  }
}

enum FenceDirection {
  HORIZONTAL = 'horizontal',
  VERTICAL = 'vertical',
}
class FenceSection {
  constructor(
    public direction: FenceDirection,
    public x: number,
    public y: number,
  ) {}

  toString(): string {
    return `${this.direction} (${this.x},${this.y})`
  }

  public isInlineWith(fenceSection: FenceSection): boolean {
    if (this.direction !== fenceSection.direction) return false
    if (this.direction === FenceDirection.HORIZONTAL && this.y === fenceSection.y) return true
    if (this.direction === FenceDirection.VERTICAL && this.x === fenceSection.x) return true
    return false
  }
}

/**
 * A fence segment is a continuous section of fence that is either horizontal or vertical.
 */
class FenceSegmentBuilder {
  public fenceSections: FenceSection[] = []

  constructor(
    public direction: FenceDirection,
    public index: number,
  ) {}

  public shouldContain(fenceSection: FenceSection): boolean {
    if (fenceSection.direction !== this.direction) return false
    if (fenceSection.direction === FenceDirection.HORIZONTAL && fenceSection.y === this.index) return true
    if (fenceSection.direction === FenceDirection.VERTICAL && fenceSection.x === this.index) return true
    return false
  }

  public addFenceSection(fenceSection: FenceSection): void {
    this.fenceSections.push(fenceSection)
  }

  public merge(fenceSegmentBuilder: FenceSegmentBuilder): void {
    for (const fenceSection of fenceSegmentBuilder.fenceSections) {
      this.addFenceSection(fenceSection)
    }
  }

  public build(): FenceSegment {
    return new FenceSegment(this.direction, this.index, this.fenceSections)
  }
}

class FenceSegment {
  constructor(
    public direction: FenceDirection,
    public index: number,
    public fenceSections: FenceSection[],
  ) {}

  getLength(): number {
    return this.fenceSections.length
  }
}

const gardenMap = new GardenMap(grid)
const regions = gardenMap.getRegions()
const fenceCostSum = regions.reduce((sum, region) => sum + region.getFenceCost(), 0)
const fenceCostWithBulkDiscountSum = regions.reduce((sum, region) => sum + region.getFenceCostWithBulkDiscount(), 0)
console.log({
  fenceCostSum,
  fenceCostWithBulkDiscountSum,
})

// TODO: Fence segments now don't care about direction or crossing, so for the text example, the vertical/horizontal segments in the
// middle should not be counted as continuous. This is a problem with the current implementation.
// Need to add a check for continuity and which side the crop is on.
