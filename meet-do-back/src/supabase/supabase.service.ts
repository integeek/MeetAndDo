import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class SupabaseService implements OnModuleInit {
  private readonly logger = new Logger(SupabaseService.name);
  private client: SupabaseClient;

  constructor(private readonly configService: ConfigService) {}

  onModuleInit() {
    const url = this.configService.get<string>('SUPABASE_URL');
    const key = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!url || !key) {
      this.logger.error(
        'SUPABASE_URL ou SUPABASE_ANON_KEY manquant dans le fichier .env',
      );
      return;
    }

    this.client = createClient(url, key);
    this.logger.log('Connexion Supabase initialisée');
  }

  getClient(): SupabaseClient {
    return this.client;
  }
}
