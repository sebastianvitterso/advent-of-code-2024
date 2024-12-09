import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)
const input = await readFile(`${dirname}/input.txt`, 'utf-8')
const testInput = '2333133121414131402'

type Block = {
  index: number
  length: number
  blockId: number | null
}

class Disk {
  public blockLengths: number[]

  constructor(input: string) {
    this.blockLengths = input.split('').map((char) => Number.parseInt(char))
  }

  private static convertBlockLengthsToStorage(blockLengths: number[]): (number | null)[] {
    const storage: (number | null)[] = []
    let isFreeSpace = false
    let blockId = 0
    for (const blockLength of blockLengths) {
      const currentBlockId = isFreeSpace ? null : blockId++
      for (let j = 0; j < blockLength; j++) {
        storage.push(currentBlockId)
      }
      isFreeSpace = !isFreeSpace
    }
    return storage
  }

  private static convertBlockLengthsToBlockArray(blockLengths: number[]): Block[] {
    const blocks: Block[] = []
    let isFreeSpace = false
    let index = 0
    let blockId = 0
    for (const length of blockLengths) {
      blocks.push({ index, length, blockId: isFreeSpace ? null : blockId++ })
      index += length
      isFreeSpace = !isFreeSpace
    }
    return blocks.filter((block) => block.length > 0)
  }

  private static convertBlockArrayToStorage(blocks: Block[]): (number | null)[] {
    const storage: (number | null)[] = []
    for (const block of blocks) {
      for (let i = 0; i < block.length; i++) {
        storage.push(block.blockId)
      }
    }
    return storage
  }

  public getCompactified(): number[] {
    const compactifiedStorage = Disk.convertBlockLengthsToStorage(this.blockLengths)
    let nextNullStorageIndex = compactifiedStorage.indexOf(null)
    for (let i = compactifiedStorage.length - 1; i >= 0; i--) {
      const value = compactifiedStorage[i]
      compactifiedStorage[i] = null
      if (value === undefined) throw new Error('Unexpected undefined value')
      if (value === null) continue

      compactifiedStorage[nextNullStorageIndex] = value
      nextNullStorageIndex = compactifiedStorage.indexOf(null, nextNullStorageIndex + 1)
      if (nextNullStorageIndex >= i) break
    }

    // validate that there are no non-null values after the first null, then remove the nulls
    let hasReachedNulls = false
    let firstNullIndex = -1
    for (const [i, value] of compactifiedStorage.entries()) {
      if (!hasReachedNulls && value === null) {
        hasReachedNulls = true
        firstNullIndex = i
      }
      if (hasReachedNulls && value !== null) {
        throw new Error(`Unexpected non-null value in nulls section (index ${i})`)
      }
    }

    return compactifiedStorage.slice(0, firstNullIndex) as number[]
  }

  public getDefragmented(): (number | null)[] {
    const blockArray = Disk.convertBlockLengthsToBlockArray(this.blockLengths)
    const nonNullBlockArray = blockArray.filter((block) => block.blockId !== null)
    const defragmentedBlockArray: Block[] = [...blockArray]
    for (const nonNullBlock of nonNullBlockArray.toReversed()) {
      // find the next null block that fits
      const nullBlock = defragmentedBlockArray.find(
        (nullBlock, index, array) =>
          nullBlock.blockId === null && nullBlock.length >= nonNullBlock.length && index < array.indexOf(nonNullBlock),
      )
      // If no null-block is found, it's probably because there are no long enough null-blocks before the current block
      if (nullBlock === undefined) {
        continue
      }

      // Remove the non-null block from the defragmented storage, as it will be moved to the null block's index
      // Also, if the preceding or following block is null, remove them as well, and replace their gap with a single null block
      const nonNullBlockIndex = defragmentedBlockArray.indexOf(nonNullBlock)
      const precedingBlock = defragmentedBlockArray[nonNullBlockIndex - 1]
      if (precedingBlock === undefined) throw new Error('Unexpected undefined preceding block')

      const followingBlock = defragmentedBlockArray[nonNullBlockIndex + 1]
      const followingBlockLength = followingBlock?.blockId === null ? followingBlock.length : 0

      const precedingBlockIsNull = precedingBlock.blockId === null
      const replacementNullBlock = {
        index: nullBlock.index,
        length: nonNullBlock.length + (precedingBlockIsNull ? precedingBlock.length : 0) + followingBlockLength,
        blockId: null,
      }
      defragmentedBlockArray.splice(
        precedingBlockIsNull ? nonNullBlockIndex - 1 : nonNullBlockIndex,
        1 + (precedingBlockIsNull ? 1 : 0) + (followingBlock?.blockId === null ? 1 : 0),
        replacementNullBlock,
      )

      // replace the null block with the non-null block
      nonNullBlock.index = nullBlock.index
      const replacements = [nonNullBlock]
      // if necessary, add a new null block for the remaining space
      if (nullBlock.length > nonNullBlock.length) {
        replacements.push({
          index: nullBlock.index + nonNullBlock.length,
          length: nullBlock.length - nonNullBlock.length,
          blockId: null,
        })
      }
      defragmentedBlockArray.splice(defragmentedBlockArray.indexOf(nullBlock), 1, ...replacements)
    }

    return Disk.convertBlockArrayToStorage(defragmentedBlockArray)
  }

  public static calculateChecksum(storageData: (number | null)[]): number {
    let checksum = 0
    for (const [i, value] of storageData.entries()) {
      if (value === null) continue
      checksum += i * value
    }
    return checksum
  }
}

const disk = new Disk(input)
const checksum = Disk.calculateChecksum(disk.getCompactified())
console.log(checksum)

const defragmented = disk.getDefragmented()
const checksum2 = Disk.calculateChecksum(defragmented)
console.log(checksum2)
console.log(checksum2 === 6469636832766)
