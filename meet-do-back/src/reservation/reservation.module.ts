import { Module } from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { ReservationController } from './reservation.controller';
import { SupabaseModule } from 'src/supabase/supabase.module';
import { UserModule } from 'src/user/user.module';
import { EventModule } from 'src/event/event.module';
import { EventService } from 'src/event/event.service';

@Module({
  imports: [SupabaseModule, UserModule, EventModule],
  controllers: [ReservationController],
  providers: [ReservationService],
})
export class ReservationModule {}
