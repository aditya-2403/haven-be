import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Notification, NotificationDocument } from './schemas/notification.schema';

export interface SendNotificationDto {
  organizationId: string | Types.ObjectId;
  recipientUserId: string | Types.ObjectId;
  title: string;
  message: string;
  type?: string;
  data?: Record<string, any>;
  email?: string;
}

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectModel(Notification.name)
    private readonly notificationModel: Model<NotificationDocument>,
  ) {}

  async send(dto: SendNotificationDto): Promise<void> {
    try {
      // 1. Create in-app notification
      await this.notificationModel.create({
        organizationId: new Types.ObjectId(dto.organizationId.toString()),
        recipientUserId: new Types.ObjectId(dto.recipientUserId.toString()),
        title: dto.title,
        message: dto.message,
        type: dto.type || 'INFO',
        data: dto.data || {},
        read: false,
      });

      // 2. Email notification abstraction (logged / ready for SMTP)
      if (dto.email) {
        this.logger.log(
          `[Email Notification Dispatched] To: ${dto.email} | Subject: "${dto.title}" | Body: "${dto.message}"`,
        );
      }
    } catch (err) {
      this.logger.error('Failed to dispatch notification', err);
    }
  }

  async findForUser(userId: string, limit = 20) {
    return this.notificationModel
      .find({ recipientUserId: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  async markAsRead(id: string, userId: string) {
    return this.notificationModel.findOneAndUpdate(
      { _id: new Types.ObjectId(id), recipientUserId: new Types.ObjectId(userId) },
      { read: true },
      { new: true },
    );
  }

  async markAllAsRead(userId: string) {
    await this.notificationModel.updateMany(
      { recipientUserId: new Types.ObjectId(userId), read: false },
      { read: true },
    );
    return { success: true };
  }
}

