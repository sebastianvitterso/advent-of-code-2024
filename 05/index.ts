import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')

class Rule {
  constructor(
    public readonly before: number,
    public readonly after: number,
  ) {}

  public isRelevantToSequence(sequence: number[]): boolean {
    return sequence.includes(this.before) && sequence.includes(this.after)
  }

  public validateSequence(sequence: number[]): boolean {
    if (!this.isRelevantToSequence(sequence)) return true
    return sequence.indexOf(this.before) < sequence.indexOf(this.after)
  }
}

const [ruleSection, sequenceSection] = input.trim().split('\n\n')
if (!ruleSection || !sequenceSection) throw new Error('Invalid input')
const rules = ruleSection.split('\n').map((line) => {
  const [before, after] = line.split('|').map(Number)
  if (before === undefined || after === undefined) throw new Error('Invalid rule')
  return new Rule(before, after)
})
const sequences = sequenceSection.split('\n').map((line) => line.split(',').map(Number))

function getMiddleValue<T>(array: T[]): T {
  if (array.length % 2 !== 1) throw new Error('Invalid array length for getting the middle value.')
  const middleIndex = Math.floor(array.length / 2)
  const middleValue = array[middleIndex]
  if (middleValue === undefined) throw new Error('Invalid middle value')
  return middleValue
}

// part 1
const validSequences = sequences.filter((sequence) => rules.every((rule) => rule.validateSequence(sequence)))
const middleValues = validSequences.map((sequence) => getMiddleValue(sequence))
const sumOfMiddleValues = middleValues.reduce((acc, value) => acc + value, 0)
console.log(sumOfMiddleValues)

// part 2
const invalidSequences = sequences.filter((sequence) => !rules.every((rule) => rule.validateSequence(sequence)))
const fixedSequences = invalidSequences.map((sequence) => {
  let fixedSequence = [...sequence]
  let i = -1
  while (rules.some((rule) => !rule.validateSequence(fixedSequence))) {
    i++
    const rule = rules[i % rules.length]
    if (rule === undefined) throw new Error('Javascript is broken')
    if (rule.validateSequence(fixedSequence)) continue

    const beforeIndex = fixedSequence.indexOf(rule.before)
    const afterIndex = fixedSequence.indexOf(rule.after)

    // Try to move the after value to right after the before value
    const attempt1 = fixedSequence.toSpliced(afterIndex, 1).toSpliced(beforeIndex, 0, rule.after)
    const attempt1ValidRuleCount = rules.filter((rule) => rule.validateSequence(attempt1)).length

    // Try to move the before value to right before the after value
    const attempt2 = fixedSequence.toSpliced(beforeIndex, 1).toSpliced(afterIndex, 0, rule.before)
    const attempt2ValidRuleCount = rules.filter((rule) => rule.validateSequence(attempt2)).length

    // Select the attempt with the most valid rules
    if (attempt1ValidRuleCount > attempt2ValidRuleCount) {
      fixedSequence = attempt1
    } else {
      fixedSequence = attempt2
    }
    if (i > 10_000) throw new Error('Too many iterations')
  }
  return fixedSequence
})
const fixedMiddleValues = fixedSequences.map((sequence) => getMiddleValue(sequence))
const fixedSumOfMiddleValues = fixedMiddleValues.reduce((acc, value) => acc + value, 0)
console.log(fixedSumOfMiddleValues)
