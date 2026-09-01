// Wordlish · Repositorio de notificaciones
import type { Notification } from '@/types';
import { mockDb } from '@/services/mockDb';
import { BaseRepository } from './base';

class NotificationsRepository extends BaseRepository<Notification> {
  constructor() {
    super(mockDb.notifications);
  }

  listForUser(userId: string): Notification[] {
    return this.store.filter((n) => n.userId === userId);
  }

  unreadCountForUser(userId: string): number {
    return this.store.filter((n) => n.userId === userId && !n.read).length;
  }
}

export const notificationsRepo = new NotificationsRepository();
