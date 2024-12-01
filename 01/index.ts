import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const input = (await readFile(`${dirname}/input.txt`, 'utf-8'))
  .split('\n')
  .map((line) => line.split('   ').map(Number)) as [number, number][]
const left = input.map(([a, b]) => a).toSorted()
const right = input.map(([a, b]) => b).toSorted()

let distanceSum = 0
for (let i = 0; i < input.length; i++) {
  const leftVal = left[i]
  const rightVal = right[i]
  if (leftVal === undefined || rightVal === undefined) {
    throw Error('Invalid input')
  }
  distanceSum += Math.abs(leftVal - rightVal)
}
console.log({ distanceSum })

function listToMapOfOccurances(list: number[]) {
  const map = new Map<number, number>()
  for (const val of list) {
    map.set(val, (map.get(val) ?? 0) + 1)
  }
  return map
}

let similarityScore = 0
const leftMap = listToMapOfOccurances(left)
const rightMap = listToMapOfOccurances(right)
for (const [value, leftCount] of leftMap) {
  const valueSimilarityScore = value * leftCount * (rightMap.get(value) ?? 0)
  similarityScore += valueSimilarityScore
}
console.log({ similarityScore })
