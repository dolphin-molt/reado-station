const encoder = new TextEncoder()
function bytesToHex(bytes: Uint8Array): string {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

function hexToBytes(hex: string): Uint8Array {
  if (hex.length % 2 !== 0 || !/^[a-f0-9]+$/i.test(hex)) return new Uint8Array()
  const bytes = new Uint8Array(hex.length / 2)
  for (let index = 0; index < bytes.length; index++) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16)
  }
  return bytes
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

async function pbkdf2Hex(password: string, saltHex: string, iterations: number): Promise<string> {
  const salt = hexToBytes(saltHex)
  if (salt.length === 0) throw new Error('Invalid password salt')
  const saltBuffer = salt.buffer.slice(salt.byteOffset, salt.byteOffset + salt.byteLength) as ArrayBuffer

  const key = await crypto.subtle.importKey('raw', encoder.encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt: saltBuffer,
      iterations,
    },
    key,
    256,
  )

  return bytesToHex(new Uint8Array(bits))
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomHex(16)
  const hash = await sha256Hex(`password:${salt}:${password}`)
  return `salted-sha256$${salt}$${hash}`
}

export async function verifyPasswordHash(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('salted-sha256$')) {
    const [, salt, expectedHash] = storedHash.split('$')
    if (!salt || !expectedHash) return false
    const hash = await sha256Hex(`password:${salt}:${password}`)
    return constantTimeEqual(hash, expectedHash)
  }

  const [scheme, iterationsText, salt, expectedHash] = storedHash.split('$')
  const iterations = Number.parseInt(iterationsText ?? '', 10)

  if (scheme !== 'pbkdf2-sha256' || !Number.isFinite(iterations) || iterations < 10_000 || !salt || !expectedHash) {
    return false
  }

  try {
    const hash = await pbkdf2Hex(password, salt, iterations)
    return constantTimeEqual(hash, expectedHash)
  } catch {
    return false
  }
}
