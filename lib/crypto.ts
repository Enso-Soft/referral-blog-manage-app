import 'server-only'
import { randomBytes, createCipheriv, createDecipheriv } from 'crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const PREFIX = 'enc:'

function getKey(): Buffer {
  const hex = process.env.WP_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('WP_ENCRYPTION_KEY 환경변수가 설정되지 않았거나 잘못된 형식입니다. (32바이트 hex, 64자)')
  }
  return Buffer.from(hex, 'hex')
}

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })

  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return PREFIX + [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':')
}

export function decrypt(value: string): string {
  if (!isEncrypted(value)) {
    return value
  }

  const key = getKey()
  const parts = value.slice(PREFIX.length).split(':')
  if (parts.length !== 3) {
    throw new Error('암호화된 데이터 형식이 올바르지 않습니다.')
  }

  const [ivHex, authTagHex, ciphertextHex] = parts
  const iv = Buffer.from(ivHex, 'hex')
  const authTag = Buffer.from(authTagHex, 'hex')
  const ciphertext = Buffer.from(ciphertextHex, 'hex')

  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8')
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(PREFIX)
}
