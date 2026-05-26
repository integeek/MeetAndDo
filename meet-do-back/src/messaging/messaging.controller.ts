import {
  Controller,
  Post,
  Patch,
  Get,
  Query,
  Param,
  ParseIntPipe,
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

const MAX_SIZE = 5 * 1024 * 1024;

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
  async searchUsers(
    @Query('q') query: string,
    @Req() req: RequestWithUser,
  ) {
    if (!query || query.trim().length < 2) return [];
    return this.messagingService.searchUsers(query.trim(), req.user.id);
  }

  @Get('users/:id')
  @UseGuards(JwtAuthenticationGuard)
  async getUserById(@Param('id', ParseIntPipe) id: number) {
    return this.messagingService.getUserById(id);
  }

  @Patch('conversations/:id/avatar')
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(FileInterceptor('file'))
  async updateGroupAvatar(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
  ) {
    if (!file) throw new BadRequestException('No file provided');
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype))
      throw new BadRequestException('Only images are allowed');
    if (file.size > MAX_SIZE) throw new BadRequestException('File too large (max 5 MB)');

    const url = await this.messagingService.uploadFile(file);
    if (!url) throw new BadRequestException('Upload failed');

    await this.messagingService.updateGroupAvatar(id, url);
    return { url };
  }
}
