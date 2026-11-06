export const MAX_IMAGE_BYTES = 8 * 1024 * 1024
export function validateImage(file: Pick<File, 'type' | 'size'>): string {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) return 'Choose a PNG, JPEG, or WebP image.'
  if (!file.size || file.size > MAX_IMAGE_BYTES) return 'Choose an image between 1 byte and 8 MB.'
  return ''
}
