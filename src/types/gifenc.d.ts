declare module "gifenc" {
  export type GifPalette = number[][];

  export interface GifEncoderInstance {
    writeFrame(
      index: Uint8Array,
      width: number,
      height: number,
      opts?: {
        palette?: GifPalette;
        delay?: number;
        repeat?: number;
        transparent?: boolean;
        transparentIndex?: number;
        first?: boolean;
        dispose?: number;
      }
    ): void;
    finish(): void;
    bytes(): Uint8Array;
    bytesView(): Uint8Array;
  }

  export function GIFEncoder(opts?: { initialCapacity?: number; auto?: boolean }): GifEncoderInstance;
  export function quantize(
    data: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    opts?: Record<string, unknown>
  ): GifPalette;
  export function applyPalette(
    data: Uint8Array | Uint8ClampedArray,
    palette: GifPalette,
    format?: string
  ): Uint8Array;
}
