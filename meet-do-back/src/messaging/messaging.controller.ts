import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagingService } from './messaging.service';

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'text/plain',
];

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

@Controller('messaging')
export class MessagingController {
  constructor(private readonly messagingService: MessagingService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    @Body('conversationId') conversationId: string,
    @Body('senderId') senderId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Aucun fichier fourni');
    }
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('Type de fichier non autorisé');
    }
    if (file.size > MAX_SIZE) {
      throw new BadRequestException('Fichier trop volumineux (max 5 Mo)');
    }

    const url = await this.messagingService.uploadFile(file);
    if (!url) {
      throw new BadRequestException("Échec de l'upload");
    }

    const message = await this.messagingService.saveMessage({
      conversationId,
      senderId,
      content: url,
    });

    return { url, message };
  }
}
