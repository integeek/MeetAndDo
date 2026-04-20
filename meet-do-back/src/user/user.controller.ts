import { Controller, Get, Post, Patch, Body, Req, UseGuards } from '@nestjs/common';
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
}
