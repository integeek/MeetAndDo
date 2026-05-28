import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { SendMessageDto } from './dto/send-message.dto';

const STORAGE_BUCKET = 'chat-attachments';

@Injectable()
export class MessagingService {
  private readonly logger = new Logger(MessagingService.name);

  constructor(private readonly supabaseService: SupabaseService) {}

  // ================================================================
  //  UTILISATEURS
  // ================================================================

  async getUserById(id: number) {
    const { data } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('id, firstname, lastname, email, avatar_url')
      .eq('id', id)
      .single();
    return data ?? null;
  }

  async getUsersByIds(ids: number[]) {
    if (!ids.length) return [];
    const { data } = await this.supabaseService
      .getAdminClient()
      .from('users')
      .select('id, firstname, lastname, email, avatar_url')
      .in('id', ids);
    return data ?? [];
  }

  async searchUsers(query: string, currentId: number) {
    let req = this.supabaseService
      .getAdminClient()
      .from('users')
      .select('id, firstname, lastname, email, avatar_url')
      .or(`firstname.ilike.%${query}%,lastname.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(10);

    if (currentId) req = req.neq('id', currentId);

    const { data } = await req;
    return data ?? [];
  }

  // ================================================================
  //  CONVERSATIONS 1-1
  // ================================================================

  async getConversations(userId: number) {
    const client = this.supabaseService.getAdminClient();

    const { data: direct } = await client
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .eq('is_group', false)
      .order('last_message_at', { ascending: false, nullsFirst: false });

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

  async getOrCreateConversation(userId1: number, userId2: number) {
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

  async getConversationById(conversationId: number) {
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

  async createGroupConversation(
    name: string,
    creatorId: number,
    memberIds: number[],
    avatarUrl?: string,
  ) {
    const client = this.supabaseService.getAdminClient();

    const { data: conv, error } = await client
      .from('conversations')
      .insert({
        participant_1: creatorId,
        is_group: true,
        group_name: name,
        group_avatar: avatarUrl ?? null,
      })
      .select()
      .single();

    if (error) {
      this.logger.error('Erreur création groupe', error.message);
      return null;
    }

    const allMembers = Array.from(new Set([creatorId, ...memberIds]));
    await client.from('conversation_members').insert(
      allMembers.map((user_id) => ({ conversation_id: conv.id, user_id })),
    );

    return conv;
  }

  async getGroupMembers(conversationId: number): Promise<number[]> {
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

  async getMessages(conversationId: number) {
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

  async markAsRead(conversationId: number, userId: number): Promise<void> {
    const conv = await this.getConversationById(conversationId);
    if (!conv || conv.is_group) return;

    const field = conv.participant_1 === userId ? 'is_read_by_p1' : 'is_read_by_p2';
    await this.supabaseService
      .getAdminClient()
      .from('conversations')
      .update({ [field]: true })
      .eq('id', conversationId);
  }

  async updateGroupAvatar(
    conversationId: number,
    avatarUrl: string,
  ): Promise<void> {
    const { data: conv } = await this.supabaseService
      .getAdminClient()
      .from('conversations')
      .select('is_group')
      .eq('id', conversationId)
      .single();

    if (!conv?.is_group) throw new Error('Not a group conversation');

    await this.supabaseService
      .getAdminClient()
      .from('conversations')
      .update({ group_avatar: avatarUrl })
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
