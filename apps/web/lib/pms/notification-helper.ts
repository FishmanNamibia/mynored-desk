import { prisma } from './prisma'

/**
 * Safely gets a valid sender ID for notifications.
 * Returns the sender ID if the user exists in the database, otherwise returns null.
 * This prevents foreign key constraint errors when creating notifications.
 */
export async function getSafeSenderId(senderId: string | undefined | null): Promise<string | null> {
  if (!senderId) return null
  
  const senderExists = await prisma.user.findUnique({
    where: { id: senderId },
    select: { id: true },
  })
  
  return senderExists ? senderId : null
}
