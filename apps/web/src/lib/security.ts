const encoder = new TextEncoder()

function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export function constantTimeEqual(left: string, right: string): boolean {
  const leftBytes = encoder.encode(left)
  const rightBytes = encoder.encode(right)
  const maxLength = Math.max(leftBytes.length, rightBytes.length, 1)
  let mismatch = leftBytes.length ^ rightBytes.length

  for (let index = 0; index < maxLength; index++) {
    const leftByte = leftBytes.length > 0 ? leftBytes[index % leftBytes.length] : 0
    const rightByte = rightBytes.length > 0 ? rightBytes[index % rightBytes.length] : 0
    mismatch |= leftByte ^ rightByte
  }

  return mismatch === 0
}

export function randomHex(byteLength = 32): string {
  const bytes = new Uint8Array(byteLength)
  crypto.getRandomValues(bytes)
  return bytesToHex(bytes)
}

export async function sha256Hex(value: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(value))
  return bytesToHex(new Uint8Array(digest))
}
