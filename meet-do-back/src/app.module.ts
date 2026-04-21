import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthenticationModule } from './authentication/authentication.module';
import { UserModule } from './user/user.module';
import * as Joi from 'joi';
import { MailerModule } from '@nestjs-modules/mailer';
import { MessagingModule } from './messaging/messaging.module';
import { FaqModule } from './faq/faq.module';
import { ActivityModule } from './activity/activity.module';
import { ReservationModule } from './reservation/reservation.module';
import { EventModule } from './event/event.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SupabaseModule,
    AuthenticationModule,
    UserModule,
    ConfigModule.forRoot({
      envFilePath: './.env',
      validationSchema: Joi.object({
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRATION_TIME: Joi.string().required(),
      }),
    }),
    MailerModule.forRoot({
      transport: {
        host: 'smtp.gmail.com',
        port: 587,
        auth: {
          user: process.env.MAIL_USER,
          pass: process.env.MAIL_PASSWORD,
        },
      },
      defaults: {
        from: '"MeetAndDo" <meetdosav@gmail.com>',
      },
    }),
    MessagingModule,
    FaqModule,
    ActivityModule,
    ReservationModule,
    EventModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
