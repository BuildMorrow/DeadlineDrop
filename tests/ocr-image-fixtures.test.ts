import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { imageDimensions } from '../src/features/ocr/validateImage'

describe('real image headers', () => {
  it.each([
    ['png', 'image/png'], ['jpg', 'image/jpeg'], ['webp', 'image/webp'],
  ])('accepts a synthetic %s screenshot', (extension, type) => {
    const bytes = readFileSync(`tests/fixtures/ocr-sample.${extension}`)
    expect(imageDimensions(bytes, type)).toEqual({ width: 900, height: 90 })
  })
})
