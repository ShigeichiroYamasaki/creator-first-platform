import { mkdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const outputPath = path.resolve('docker/navidrome/music/local-test-tone.wav')
const sampleRate = 44_100
const durationSeconds = 5
const sampleCount = sampleRate * durationSeconds
const bytesPerSample = 2
const dataSize = sampleCount * bytesPerSample
const wav = Buffer.alloc(44 + dataSize)

wav.write('RIFF', 0)
wav.writeUInt32LE(36 + dataSize, 4)
wav.write('WAVE', 8)
wav.write('fmt ', 12)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(sampleRate, 24)
wav.writeUInt32LE(sampleRate * bytesPerSample, 28)
wav.writeUInt16LE(bytesPerSample, 32)
wav.writeUInt16LE(16, 34)
wav.write('data', 36)
wav.writeUInt32LE(dataSize, 40)

for (let index = 0; index < sampleCount; index += 1) {
  const fadeSamples = sampleRate / 20
  const fadeIn = Math.min(1, index / fadeSamples)
  const fadeOut = Math.min(1, (sampleCount - index) / fadeSamples)
  const envelope = Math.min(fadeIn, fadeOut)
  const sample = Math.round(
    Math.sin((2 * Math.PI * 440 * index) / sampleRate) * 0.15 * envelope * 32_767
  )
  wav.writeInt16LE(sample, 44 + index * bytesPerSample)
}

await mkdir(path.dirname(outputPath), { recursive: true })

try {
  const existing = await stat(outputPath)
  if (existing.size === wav.length) {
    console.log(`Local test audio already exists: ${outputPath}`)
    process.exit(0)
  }
} catch (error) {
  if (error.code !== 'ENOENT') throw error
}

await writeFile(outputPath, wav)
console.log(`Generated synthetic 440 Hz test audio: ${outputPath}`)
