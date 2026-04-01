import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;
  private adminClient: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_ANON_KEY');
    const serviceKey = this.configService.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !key) {
      this.logger.error(
        'SUPABASE_URL ou SUPABASE_ANON_KEY manquant dans le fichier .env',
      );
      return;
    }

    this.client = createClient(url, key);

    // Client admin (bypass RLS) — utilisé côté serveur uniquement
    if (serviceKey) {
      this.adminClient = createClient(url, serviceKey, {
        auth: { persistSession: false },
      });
      this.logger.log('Connexion Supabase initialisée (anon + service role)');
    } else {
      this.adminClient = this.client;
      this.logger.warn(
        'SUPABASE_SERVICE_ROLE_KEY absent — le client admin utilise la clé anon (RLS actif)',
      );
    }
  }

  /** Client public (clé anon) */
  getClient(): SupabaseClient {
    return this.client;
  }

  /** Client admin (service role key) — bypass RLS, à utiliser côté serveur uniquement */
  getAdminClient(): SupabaseClient {
    return this.adminClient;
  }
}
