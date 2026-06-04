import { prisma } from '@/lib/pms/prisma'

export type NotificationType = 
  | 'RISK_DOCUMENT'
  | 'RISK_TASK_ASSIGNED'
  | 'RISK_TASK_UPDATED'
  | 'RISK_TASK_COMPLETED'
  | 'RISK_TASK_APPROVED'

export async function createPmsNotification({
  type,
  senderId,
  receiverId,
  entityType,
  entityId,
  message,
  metadata
}: {
  type: NotificationType
  senderId: string
  receiverId: string
  entityType: string
  entityId: string
  message: string
  metadata?: Record<string, any>
}) {
  try {
    const notification = await prisma.pmsNotification.create({
      data: {
        type,
        status: 'PENDING',
        senderId,
        receiverId,
        entityType,
        entityId,
        message,
        metadata: metadata ? JSON.stringify(metadata) : undefined
      }
    })
    
    return notification
  } catch (error) {
    console.error('Error creating notification:', error)
    throw error
  }
}

export async function markNotificationAsRead(notificationId: string) {
  try {
    const notification = await prisma.pmsNotification.update({
      where: { id: notificationId },
      data: { status: 'READ' }
    })
    
    return notification
  } catch (error) {
    console.error('Error marking notification as read:', error)
    throw error
  }
}

export async function markAllUserNotificationsAsRead(userId: string) {
  try {
    const result = await prisma.pmsNotification.updateMany({
      where: { receiverId: userId, status: 'PENDING' },
      data: { status: 'READ' }
    })
    
    return result
  } catch (error) {
    console.error('Error marking all notifications as read:', error)
    throw error
  }
}

export async function getUserUnreadNotificationsCount(userId: string) {
  try {
    const count = await prisma.pmsNotification.count({
      where: { receiverId: userId, status: 'PENDING' }
    })
    
    return count
  } catch (error) {
    console.error('Error getting unread notifications count:', error)
    throw error
  }
}

export async function deleteNotification(notificationId: string) {
  try {
    const notification = await prisma.pmsNotification.delete({
      where: { id: notificationId }
    })
    
    return notification
  } catch (error) {
    console.error('Error deleting notification:', error)
    throw error
  }
}
