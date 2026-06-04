export function getSafeSenderId(userId: string | null | undefined): string | null {
  if (!userId || typeof userId !== 'string' || userId.trim() === '') {
    return null
  }
  return userId.trim()
}