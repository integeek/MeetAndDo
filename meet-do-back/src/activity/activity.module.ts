import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [
    SupabaseModule,
    MulterModule.register({ storage: memoryStorage() }),
  ],
  controllers: [ActivityController],
  providers: [ActivityService],
})
export class ActivityModule {}
