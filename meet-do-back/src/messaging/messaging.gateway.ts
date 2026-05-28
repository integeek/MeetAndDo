import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { MessagingService } from './messaging.service';
import { SendMessageDto } from './dto/send-message.dto';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/messaging',
})
export class MessagingGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server!: Server;
  private readonly logger = new Logger(MessagingGateway.name);

  constructor(private readonly messagingService: MessagingService) {}

  afterInit() {
    this.logger.log('MessagingGateway initialisé');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connecté: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client déconnecté: ${client.id}`);
  }

  @SubscribeMessage('register')
  async handleRegister(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(String(data.userId));
    this.logger.log(`Utilisateur ${data.userId} enregistré`);
  }

  @SubscribeMessage('get_conversations')
  async handleGetConversations(
    @MessageBody() data: { userId: number },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(String(data.userId));
    const conversations = await this.messagingService.getConversations(data.userId);
    client.emit('conversations_list', conversations);
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: number; userId?: number },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(String(data.conversationId));
    const messages = await this.messagingService.getMessages(data.conversationId);
    client.emit('messages_history', messages);
    if (data.userId) {
      await this.messagingService.markAsRead(data.conversationId, data.userId);
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @MessageBody() dto: SendMessageDto,
    @ConnectedSocket() client: Socket,
  ) {
    const message = await this.messagingService.saveMessage(dto);
    if (!message) {
      client.emit('error', { message: "Échec de l'envoi du message" });
      return;
    }

    this.server.to(String(dto.conversationId)).emit('new_message', message);

    const conversation = await this.messagingService.getConversationById(dto.conversationId);
    if (!conversation) return;

    if (conversation.is_group) {
      const members = await this.messagingService.getGroupMembers(dto.conversationId);
      for (const memberId of members) {
        if (memberId !== dto.senderId) {
          this.server.to(String(memberId)).emit('new_conversation_notification', conversation);
        }
      }
    } else {
      const recipientId =
        conversation.participant_1 === dto.senderId
          ? conversation.participant_2
          : conversation.participant_1;
      if (recipientId) {
        this.server.to(String(recipientId)).emit('new_conversation_notification', conversation);
      }
    }
  }

  @SubscribeMessage('open_conversation')
  async handleOpenConversation(
    @MessageBody() data: { userId1: number; userId2: number },
  ) {
    const conversation = await this.messagingService.getOrCreateConversation(
      data.userId1,
      data.userId2,
    );
    if (conversation) {
      this.server.to(String(data.userId1)).emit('conversation_opened', conversation);
      this.server.to(String(data.userId2)).emit('conversation_opened', conversation);
    }
  }

  @SubscribeMessage('create_group')
  async handleCreateGroup(
    @MessageBody() data: { name: string; creatorId: number; memberIds: number[]; avatarUrl?: string },
  ) {
    const conversation = await this.messagingService.createGroupConversation(
      data.name,
      data.creatorId,
      data.memberIds,
      data.avatarUrl,
    );
    if (!conversation) return;

    const allIds = Array.from(new Set([data.creatorId, ...data.memberIds]));
    for (const uid of allIds) {
      this.server.to(String(uid)).emit('conversation_opened', conversation);
    }
  }
}
