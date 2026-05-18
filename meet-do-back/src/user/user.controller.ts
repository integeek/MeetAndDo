import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Body,
  Delete,
  Patch,
  UseGuards,
  Req,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PublisherApplicationDto } from './dto/publisher-application.dto';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import type RequestWithUser from 'src/authentication/requestWithUser.interface';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';

interface UploadedMulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

const ALLOWED_AVATAR_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Patch()
  async update(
    @Req() request: RequestWithUser,
    @Body() body: Partial<UpdateUserDto>,
  ) {
    return this.userService.update(request.user.id, body);
  }

  @Get('me')
  @UseGuards(JwtAuthenticationGuard)
  getMe(@Req() req: RequestWithUser) {
    return this.userService.getProfile(req.user.id);
  }

  @Patch('me')
  @UseGuards(JwtAuthenticationGuard)
  updateMe(
    @Req() req: RequestWithUser,
    @Body() body: { firstname?: string; lastname?: string; address?: string },
  ) {
    return this.userService.updateProfile(req.user.id, body);
  }

  @Post('request-publisher')
  @UseGuards(JwtAuthenticationGuard)
  requestPublisher(
    @Req() req: RequestWithUser,
    @Body() body: PublisherApplicationDto,
  ) {
    return this.userService.requestPublisher(req.user.id, body);
  }

  @Delete('request-publisher')
  @UseGuards(JwtAuthenticationGuard)
  cancelPublisherRequest(@Req() req: RequestWithUser) {
    return this.userService.cancelPublisherRequest(req.user.id);
  }

  @Post('request-publisher/cancel')
  @UseGuards(JwtAuthenticationGuard)
  cancelPublisherRequestWithPost(@Req() req: RequestWithUser) {
    return this.userService.cancelPublisherRequest(req.user.id);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthenticationGuard)
  changePassword(
    @Req() req: RequestWithUser,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.userService.changePassword(
      req.user.id,
      body.currentPassword,
      body.newPassword,
    );
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(
    FileInterceptor('avatar', {
      storage: memoryStorage(),
      limits: {
        files: 1,
        fileSize: MAX_AVATAR_SIZE,
      },
    }),
  )
  uploadAvatar(
    @Req() req: RequestWithUser,
    @UploadedFile() file: UploadedMulterFile,
  ) {
    if (!file) {
      throw new BadRequestException('Aucune image fournie');
    }

    if (!ALLOWED_AVATAR_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Format non autorisé. Utilisez une image JPG, PNG, GIF ou WebP.',
      );
    }

    if (file.size > MAX_AVATAR_SIZE) {
      throw new BadRequestException("L'image doit faire moins de 5 Mo");
    }

    return this.userService.uploadAvatar(req.user.id, file);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Patch('password')
  async updatePassword(
    @Req() request: RequestWithUser,
    @Body() body: { oldPassword: string; password: string },
  ) {
    return this.userService.updatePassword(
      request.user.id,
      body.oldPassword,
      body.password,
    );
  }
}
