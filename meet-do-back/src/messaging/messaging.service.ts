import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SendMessageDto } from './dto/send-message.dto';

const STORAGE_BUCKET = 'chat-attachments';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  async getConversations(userId: string) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) {
      this.logger.error(`getConversations erreur: ${error.message}`);
      return [];
    }
    this.logger.log(`getConversations(${userId}) → ${data?.length ?? 0} conv`);
    return data ?? [];
  }

  async getOrCreateConversation(userId1: string, userId2: string) {
    const client = this.supabaseService.getAdminClient();

    const { data: existing } = await client
      .from('conversations')
      .select('*')
      .or(
        `and(participant_1.eq.${userId1},participant_2.eq.${userId2}),and(participant_1.eq.${userId2},participant_2.eq.${userId1})`,
      )
      .maybeSingle();

    if (existing) return existing;

    const { data, error } = await client
      .from('conversations')
      .insert({ participant_1: userId1, participant_2: userId2 })
      .select()
      .single();

    if (error) {
      this.logger.error('Erreur création conversation', error.message);
      return null;
    }
    return data;
  }

  async getConversationById(conversationId: string) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .maybeSingle();

    if (error) {
      this.logger.error('Erreur récupération conversation', error.message);
      return null;
    }
    return data;
  }

  async getMessages(conversationId: string) {
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      this.logger.error(`getMessages erreur: ${error.message}`);
      return [];
    }
    this.logger.log(`getMessages(${conversationId}) → ${data?.length ?? 0} msg`);
    return data ?? [];
  }

  async uploadFile(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<string | null> {
    const ext = file.originalname.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await this.supabaseService
      .getAdminClient()
      .storage
      .from(STORAGE_BUCKET)
      .upload(path, file.buffer, {
        contentType: file.mimetype,
        upsert: false,
      });

    if (error) {
      this.logger.error(`uploadFile erreur: ${error.message}`);
      return null;
    }

    const { data } = this.supabaseService
      .getAdminClient()
      .storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  async saveMessage(dto: SendMessageDto) {
    const client = this.supabaseService.getAdminClient();

    const { data, error } = await client
      .from('messages')
      .insert({
        conversation_id: dto.conversationId,
        sender_id: dto.senderId,
        content: dto.content,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Erreur sauvegarde message', error.message);
      return null;
    }

    await client
      .from('conversations')
      .update({
        last_message: dto.content,
        last_message_at: data.created_at,
      })
      .eq('id', dto.conversationId);

    return data;
  }
}
