import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SendMessageDto } from './dto/send-message.dto';

const STORAGE_BUCKET = 'chat-attachments';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ================================================================
  //  UTILITAIRES UUID ↔ INT
  // ================================================================

  intToUUID(id: number): string {
    return `00000000-0000-0000-0000-${id.toString().padStart(12, '0')}`;
  }

  uuidToInt(uuid: string): number | null {
    const match = uuid.match(/^00000000-0000-0000-0000-0*(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  }

  // ================================================================
  //  UTILISATEURS
  // ================================================================

  async getUserByUUID(uuid: string) {
    const id = this.uuidToInt(uuid);
    if (!id) return null;
    const { data } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('id, firstname, lastname, email')
      .eq('id', id)
      .single();
    if (!data) return null;
    return { ...data, uuid };
  }

  async getUsersByUUIDs(uuids: string[]) {
    const ids = uuids.map(u => this.uuidToInt(u)).filter(Boolean) as number[];
    if (!ids.length) return [];
    const { data } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('id, firstname, lastname, email')
      .in('id', ids);
    return (data ?? []).map(u => ({ ...u, uuid: this.intToUUID(u.id) }));
  }

  async searchUsers(query: string, currentUUID: string) {
    const currentId = this.uuidToInt(currentUUID);
    let req = this.supabaseService
      .getAdminClient()
      .from('users')
      .select('id, firstname, lastname, email')
      .or(`firstname.ilike.%${query}%,lastname.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (currentId) req = req.neq('id', currentId);

    const { data } = await req;
    return (data ?? []).map(u => ({ ...u, uuid: this.intToUUID(u.id) }));
  }

  // ================================================================
  //  CONVERSATIONS 1-1
  // ================================================================

  async getConversations(userId: string) {
    const client = this.supabaseService.getAdminClient();

    // Conversations directes (1-1)
    const { data: direct } = await client
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .eq('is_group', false)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    // Conversations de groupe (via conversation_members)
    const { data: memberRows } = await client
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', userId);

    const groupIds = (memberRows ?? []).map((r: any) => r.conversation_id);
    let groups: any[] = [];
    if (groupIds.length > 0) {
      const { data: groupConvs } = await client
        .from('conversations')
        .select('*')
        .in('id', groupIds)
        .order('last_message_at', { ascending: false, nullsFirst: false });
      groups = groupConvs ?? [];
    }

    const all = [...(direct ?? []), ...groups];
    all.sort((a, b) => {
      if (!a.last_message_at) return 1;
      if (!b.last_message_at) return -1;
      return new Date(b.last_message_at).getTime() - new Date(a.last_message_at).getTime();
    });

    this.logger.log(`getConversations(${userId}) → ${all.length} conv`);
    return all;
  }

  async getOrCreateConversation(userId1: string, userId2: string) {
    const client = this.supabaseService.getAdminClient();

    const { data: existing } = await client
      .from('conversations')
      .select('*')
      .or(
        `and(participant_1.eq.${userId1},participant_2.eq.${userId2}),and(participant_1.eq.${userId2},participant_2.eq.${userId1})`,
      )
      .eq('is_group', false)
      .maybeSingle();

    if (existing) return existing;

    const { data, error } = await client
      .from('conversations')
      .insert({ participant_1: userId1, participant_2: userId2, is_group: false })
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

  // ================================================================
  //  GROUPES
  // ================================================================

  async createGroupConversation(name: string, creatorId: string, memberIds: string[]) {
    const client = this.supabaseService.getAdminClient();

    const { data: conv, error } = await client
      .from('conversations')
      .insert({ participant_1: creatorId, is_group: true, group_name: name })
      .select()
      .single();

    if (error) {
      this.logger.error('Erreur création groupe', error.message);
      return null;
    }

    const allMembers = Array.from(new Set([creatorId, ...memberIds]));
    await client.from('conversation_members').insert(
      allMembers.map(user_id => ({ conversation_id: conv.id, user_id })),
    );

    return conv;
  }

  async getGroupMembers(conversationId: string): Promise<string[]> {
    const { data } = await this.supabaseService
      .getAdminClient()
      .from('conversation_members')
      .select('user_id')
      .eq('conversation_id', conversationId);
    return (data ?? []).map((m: any) => m.user_id);
  }

  // ================================================================
  //  MESSAGES
  // ================================================================

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
    return data ?? [];
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

    // Mettre à jour le résumé de la conversation
    const conv = await this.getConversationById(dto.conversationId);
    if (conv) {
      const update: any = {
        last_message: dto.content,
        last_message_at: data.created_at,
        last_sender_id: dto.senderId,
      };

      if (!conv.is_group) {
        const isP1 = conv.participant_1 === dto.senderId;
        Object.assign(update, isP1 ? { is_read_by_p2: false } : { is_read_by_p1: false });
      }

      await client.from('conversations').update(update).eq('id', dto.conversationId);
    }

    return data;
  }

  async markAsRead(conversationId: string, userId: string): Promise<void> {
    const conv = await this.getConversationById(conversationId);
    if (!conv || conv.is_group) return;

    const field = conv.participant_1 === userId ? 'is_read_by_p1' : 'is_read_by_p2';
    await this.supabaseService
      .getAdminClient()
      .from('conversations')
      .update({ [field]: true })
      .eq('id', conversationId);
  }

  // ================================================================
  //  FICHIERS
  // ================================================================

  async uploadFile(file: { buffer: Buffer; originalname: string; mimetype: string }): Promise<string | null> {
    const ext = file.originalname.split('.').pop();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await this.supabaseService
      .getAdminClient()
      .storage
      .from(STORAGE_BUCKET)
      .upload(path, file.buffer, { contentType: file.mimetype, upsert: false });

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
}
