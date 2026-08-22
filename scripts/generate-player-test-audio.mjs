import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const outputPath = path.resolve('apps/player/public/demo-tone.wav')
const sampleRate = 44_100
const durationSeconds = 5
const sampleCount = sampleRate * durationSeconds
const dataSize = sampleCount * 2
const wav = Buffer.alloc(44 + dataSize)

wav.write('RIFF', 0)
wav.writeUInt32LE(36 + dataSize, 4)
wav.write('WAVE', 8)
wav.write('fmt ', 12)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(sampleRate, 24)
wav.writeUInt32LE(sampleRate * 2, 28)
wav.writeUInt16LE(2, 32)
wav.writeUInt16LE(16, 34)
wav.write('data', 36)
wav.writeUInt32LE(dataSize, 40)

for (let index = 0; index < sampleCount; index += 1) {
  const fade = Math.min(1, index / 2_205, (sampleCount - index) / 2_205)
  const sample = Math.round(Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.15 * fade * 32_767)
  wav.writeInt16LE(sample, 44 + index * 2)
}

await mkdir(path.dirname(outputPath), { recursive: true })
try {
  if ((await stat(outputPath)).size === wav.length) {
    console.log(`Player test audio already exists: ${outputPath}`)
    process.exit(0)
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

await writeFile(outputPath, wav)
console.log(`Generated synthetic player audio: ${outputPath}`)
