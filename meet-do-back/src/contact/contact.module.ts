import { Module } from '@nestjs/common';
import { ContactService } from './contact.service';
import { ContactController } from './contact.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { MailerModule } from '@nestjs-modules/mailer';

@Module({
  imports: [SupabaseModule, MailerModule],
  controllers: [ContactController],
  providers: [ContactService],
  exports: [ContactService],
})
export class ContactModule {}
