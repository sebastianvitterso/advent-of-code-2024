import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')

function getMulNumbers(input: string): [number, number][] {
  const matches = Array.from(input.matchAll(/mul\((\d+),(\d+)\)/g)).map(
    (match) => [Number.parseInt(match[1] ?? '0'), Number.parseInt(match[2] ?? '0')] as [number, number],
  )
  return matches
}

const mulNumbers = getMulNumbers(input)
const products = mulNumbers.map(([a, b]) => a * b)
const mulNumbersSum = products.reduce((acc, product) => acc + product, 0)

console.log(mulNumbersSum)

class MulMatch {
  constructor(
    public a: number,
    public b: number,
  ) {}
}

function parseWithDoDonts(input: string): [number, number][] {
  let index = 0

  const mulMatches: MulMatch[] = []
  const mulRegex = /^mul\((\d+),(\d+)\)/
  let enabled = true
  const doRegex = /^do\(\)/
  const dontRegex = /^don't\(\)/
  while (index < input.length) {
    const currentView = input.slice(index)
    const mulRegexMatch = currentView.match(mulRegex)
    if (mulRegexMatch) {
      const [_, a, b] = mulRegexMatch
      if (a === undefined || b === undefined) {
        throw new Error('Invalid match')
      }
      if (enabled) {
        mulMatches.push(new MulMatch(Number.parseInt(a), Number.parseInt(b)))
      }
      index += mulRegexMatch[0].length
      continue
    }
    const doRegexMatch = currentView.match(doRegex)
    if (doRegexMatch) {
      enabled = true
      index += doRegexMatch[0].length
      continue
    }
    const dontRegexMatch = currentView.match(dontRegex)
    if (dontRegexMatch) {
      enabled = false
      index += dontRegexMatch[0].length
      continue
    }
    index++
  }

  return mulMatches.map(({ a, b }) => [a, b])
}

const parsedWithDoDonts = parseWithDoDonts(input)
const productsWithDoDonts = parsedWithDoDonts.map(([a, b]) => a * b)
const sumWithDoDonts = productsWithDoDonts.reduce((acc, product) => acc + product, 0)
console.log(sumWithDoDonts)
