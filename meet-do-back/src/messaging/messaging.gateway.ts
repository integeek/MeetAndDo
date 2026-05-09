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
  @WebSocketServer() server: Server;
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

  // ----------------------------------------------------------------
  //  Enregistrement + chargement des conversations
  // ----------------------------------------------------------------

  @SubscribeMessage('register')
  async handleRegister(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(data.userId);
    this.logger.log(`Utilisateur ${data.userId} enregistré`);
  }

  @SubscribeMessage('get_conversations')
  async handleGetConversations(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(data.userId);
    const conversations = await this.messagingService.getConversations(data.userId);
    client.emit('conversations_list', conversations);
  }

  // ----------------------------------------------------------------
  //  Rejoindre une conversation
  // ----------------------------------------------------------------

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string; userId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(data.conversationId);
    const messages = await this.messagingService.getMessages(data.conversationId);
    client.emit('messages_history', messages);
    if (data.userId) {
      await this.messagingService.markAsRead(data.conversationId, data.userId);
    }
  }

  // ----------------------------------------------------------------
  //  Envoyer un message (1-1 et groupe)
  // ----------------------------------------------------------------

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

    // Diffuser à tous les membres de la room de la conversation
    this.server.to(dto.conversationId).emit('new_message', message);

    const conversation = await this.messagingService.getConversationById(dto.conversationId);
    if (!conversation) return;

    if (conversation.is_group) {
      // Notifier tous les membres via leur room perso
      const members = await this.messagingService.getGroupMembers(dto.conversationId);
      for (const memberId of members) {
        if (memberId !== dto.senderId) {
          this.server.to(memberId).emit('new_conversation_notification', conversation);
        }
      }
    } else {
      // Notifier le destinataire via sa room perso
      const recipientId =
        conversation.participant_1 === dto.senderId
          ? conversation.participant_2
          : conversation.participant_1;
      if (recipientId) {
        this.server.to(recipientId).emit('new_conversation_notification', conversation);
      }
    }
  }

  // ----------------------------------------------------------------
  //  Ouvrir / créer une conversation 1-1
  // ----------------------------------------------------------------

  @SubscribeMessage('open_conversation')
  async handleOpenConversation(
    @MessageBody() data: { userId1: string; userId2: string },
  ) {
    const conversation = await this.messagingService.getOrCreateConversation(
      data.userId1,
      data.userId2,
    );
    if (conversation) {
      this.server.to(data.userId1).emit('conversation_opened', conversation);
      this.server.to(data.userId2).emit('conversation_opened', conversation);
    }
  }

  // ----------------------------------------------------------------
  //  Créer un groupe
  // ----------------------------------------------------------------

  @SubscribeMessage('create_group')
  async handleCreateGroup(
    @MessageBody() data: { name: string; creatorId: string; memberIds: string[] },
  ) {
    const conversation = await this.messagingService.createGroupConversation(
      data.name,
      data.creatorId,
      data.memberIds,
    );
    if (!conversation) return;

    const allIds = Array.from(new Set([data.creatorId, ...data.memberIds]));
    for (const uid of allIds) {
      this.server.to(uid).emit('conversation_opened', conversation);
    }
  }
}
