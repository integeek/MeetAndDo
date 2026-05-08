import {
  Controller,
  Post,
  Get,
  Query,
  Param,
  UploadedFile,
  UseInterceptors,
  UseGuards,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { MessagingService } from './messaging.service';
import JwtAuthenticationGuard from '../authentication/guard/jwt-authentication.guard';
import type RequestWithUser from '../authentication/requestWithUser.interface';

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
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_TYPES.includes(file.mimetype)) throw new BadRequestException('File type not allowed');
    if (file.size > MAX_SIZE) throw new BadRequestException('File too large (max 5 MB)');

    const url = await this.messagingService.uploadFile(file);
    if (!url) throw new BadRequestException('Upload failed');

    return { url };
  }

  @Get('users/search')
  @UseGuards(JwtAuthenticationGuard)
  async searchUsers(@Query('q') query: string, @Req() req: RequestWithUser) {
    if (!query || query.trim().length < 2) return [];
    const currentUUID = this.messagingService.intToUUID(req.user.id);
    return this.messagingService.searchUsers(query.trim(), currentUUID);
  }

  @Get('users/:uuid')
  @UseGuards(JwtAuthenticationGuard)
  async getUserByUUID(@Param('uuid') uuid: string) {
    return this.messagingService.getUserByUUID(uuid);
  }
}
