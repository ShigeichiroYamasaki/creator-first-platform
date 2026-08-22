export class AudioEngine {
  constructor(private readonly element: HTMLAudioElement) {}

  load(url: string): void {
    this.element.pause()
    this.element.src = url
    this.element.load()
  }

  play(): Promise<void> {
    return this.element.play()
  }

  pause(): void {
    this.element.pause()
  }

  seek(seconds: number): void {
    if (Number.isFinite(seconds)) this.element.currentTime = Math.max(0, seconds)
  }

  setVolume(volume: number): void {
    this.element.volume = Math.min(1, Math.max(0, volume))
  }

  close(): void {
    this.element.pause()
    this.element.removeAttribute('src')
    this.element.load()
  }
}
