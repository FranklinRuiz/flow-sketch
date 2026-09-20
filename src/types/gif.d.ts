declare module 'gif.js' {
  export interface GIFOptions {
    workers?: number
    workerScript?: string
    repeat?: number
    background?: string
    quality?: number
    width?: number | null
    height?: number | null
    transparent?: string | null
    debug?: boolean
    dither?: boolean | string
  }

  export interface GIFAddFrameOptions {
    delay?: number
    copy?: boolean
  }

  type GIFImageSource = CanvasRenderingContext2D | HTMLCanvasElement | HTMLImageElement | ImageData

  export default class GIF {
    constructor(options?: GIFOptions)
    running: boolean
    addFrame(image: GIFImageSource, options?: GIFAddFrameOptions): void
    on(event: 'start' | 'abort', callback: () => void): void
    on(event: 'progress', callback: (progress: number) => void): void
    on(event: 'finished', callback: (blob: Blob, data: Uint8Array) => void): void
    render(): void
    abort(): void
  }
}

declare module 'gif.js/dist/gif.worker.js?url' {
  const url: string
  export default url
}
