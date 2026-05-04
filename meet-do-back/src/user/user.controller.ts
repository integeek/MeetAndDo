import { Controller, Get, Post, Patch, Body, Req, UseGuards, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { File as MulterFile } from 'multer';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import JwtAuthenticationGuard from '../authentication/guard/jwt-authentication.guard';
import type RequestWithUser from '../authentication/requestWithUser.interface';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
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
  requestPublisher(@Req() req: RequestWithUser) {
    return this.userService.requestPublisher(req.user.id);
  }

  @Patch('me/password')
  @UseGuards(JwtAuthenticationGuard)
  changePassword(
    @Req() req: RequestWithUser,
    @Body() body: { currentPassword: string; newPassword: string },
  ) {
    return this.userService.changePassword(req.user.id, body.currentPassword, body.newPassword);
  }

  @Post('me/avatar')
  @UseGuards(JwtAuthenticationGuard)
  @UseInterceptors(FileInterceptor('avatar', { storage: memoryStorage() }))
  uploadAvatar(
    @Req() req: RequestWithUser,
    @UploadedFile() file: MulterFile,
  ) {
    return this.userService.uploadAvatar(req.user.id, file);
  }
}
