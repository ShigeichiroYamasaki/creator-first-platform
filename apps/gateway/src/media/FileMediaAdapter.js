import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { parseSingleRange } from './range.js'

export class FileMediaAdapter {
  constructor(root) {
    this.root = path.resolve(root)
  }

  async open(reference, rangeHeader) {
    const target = path.resolve(this.root, reference)
    if (target !== this.root && !target.startsWith(`${this.root}${path.sep}`)) {
      throw new Error('Media reference escaped the approved root')
    }
    const details = await stat(target)
    if (!details.isFile()) throw new Error('Media reference is not a file')
    const range = parseSingleRange(rangeHeader, details.size)
    const length = range.end - range.start + 1
    return {
      status: range.partial ? 206 : 200,
      headers: {
        'Accept-Ranges': 'bytes',
        'Content-Length': String(length),
        'Content-Type': reference.endsWith('.wav') ? 'audio/wav' : 'application/octet-stream',
        ...(range.partial ? { 'Content-Range': `bytes ${range.start}-${range.end}/${details.size}` } : {})
      },
      body: createReadStream(target, { start: range.start, end: range.end }),
      rangeSummary: `${range.start}-${range.end}/${details.size}`
    }
  }
}
