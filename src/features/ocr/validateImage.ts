export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export const MAX_IMAGE_PIXELS = 16_000_000
export function validateImage(file: Pick<File, 'type' | 'size'>): string {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return 'Choose a PNG, JPEG, or WebP image.'
  if (!file.size || file.size > MAX_IMAGE_BYTES) return 'Choose an image between 1 byte and 8 MB.'
  return ''
}

// Read dimensions before decoding so highly compressed, oversized images are rejected early.
// The browser decoder still validates the complete image afterwards.
export function imageDimensions(bytes: Uint8Array, type: string): { width: number; height: number } | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength)
  if (type === 'image/png') {
    const signature = [137, 80, 78, 71, 13, 10, 26, 10]
    if (bytes.length < 24 || !signature.every((byte, i) => bytes[i] === byte) || view.getUint32(8) !== 13 || String.fromCharCode(...bytes.slice(12, 16)) !== 'IHDR') return null
    return { width: view.getUint32(16), height: view.getUint32(20) }
  }
  if (type === 'image/jpeg') {
    if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return null
    let i = 2
    while (i < bytes.length) {
      if (bytes[i++] !== 0xff) return null
      while (bytes[i] === 0xff) i++
      if (i >= bytes.length) return null
      const marker = bytes[i++]
      if (marker === 0xd9 || marker === 0xda || marker === 0x00) return null
      if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue
      if (i + 2 > bytes.length) return null
      const length = view.getUint16(i)
      if (length < 2 || i + length > bytes.length) return null
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        if (length < 8) return null
        return { width: view.getUint16(i + 5), height: view.getUint16(i + 3) }
      }
      i += length
    }
    return null
  }
  if (type === 'image/webp') {
    if (bytes.length < 30 || String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF' || String.fromCharCode(...bytes.slice(8, 12)) !== 'WEBP') return null
    const chunk = String.fromCharCode(...bytes.slice(12, 16))
    if (chunk === 'VP8X') return { width: 1 + bytes[24] + (bytes[25] << 8) + (bytes[26] << 16), height: 1 + bytes[27] + (bytes[28] << 8) + (bytes[29] << 16) }
    if (chunk === 'VP8L' && bytes[20] === 0x2f) {
      const bits = view.getUint32(21, true)
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 }
    }
    if (chunk === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) return { width: view.getUint16(26, true) & 0x3fff, height: view.getUint16(28, true) & 0x3fff }
  }
  return null
}

export function validImageDimensions(dimensions: { width: number; height: number }): boolean {
  return dimensions.width > 0 && dimensions.height > 0 && dimensions.width * dimensions.height <= MAX_IMAGE_PIXELS
}
