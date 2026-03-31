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

  @SubscribeMessage('register')
  async handleRegister(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Chaque utilisateur rejoint une room personnelle identifiée par son userId
    await client.join(data.userId);
    this.logger.log(`Utilisateur ${data.userId} enregistré (room perso)`);
  }

  @SubscribeMessage('get_conversations')
  async handleGetConversations(
    @MessageBody() data: { userId: string },
    @ConnectedSocket() client: Socket,
  ) {
    // Rejoindre la room perso pour recevoir les notifications
    await client.join(data.userId);
    const conversations = await this.messagingService.getConversations(
      data.userId,
    );
    client.emit('conversations_list', conversations);
  }

  @SubscribeMessage('join_conversation')
  async handleJoinConversation(
    @MessageBody() data: { conversationId: string },
    @ConnectedSocket() client: Socket,
  ) {
    await client.join(data.conversationId);
    const messages = await this.messagingService.getMessages(
      data.conversationId,
    );
    client.emit('messages_history', messages);
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

    // Diffuser à tous les membres de la room de conversation
    this.server.to(dto.conversationId).emit('new_message', message);

    // Notifier le destinataire via sa room perso s'il n'est pas dans la room
    const conversation = await this.messagingService.getConversationById(
      dto.conversationId,
    );
    if (conversation) {
      const recipientId =
        conversation.participant_1 === dto.senderId
          ? conversation.participant_2
          : conversation.participant_1;

      this.server
        .to(recipientId)
        .emit('new_conversation_notification', conversation);
    }
  }

  @SubscribeMessage('open_conversation')
  async handleOpenConversation(
    @MessageBody() data: { userId1: string; userId2: string },
  ) {
    const conversation = await this.messagingService.getOrCreateConversation(
      data.userId1,
      data.userId2,
    );
    if (conversation) {
      // Notifier les deux participants via leur room perso
      this.server.to(data.userId1).emit('conversation_opened', conversation);
      this.server.to(data.userId2).emit('conversation_opened', conversation);
    }
  }
}
