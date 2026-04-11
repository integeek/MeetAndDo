import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import type RequestWithUser from 'src/authentication/requestWithUser.interface';

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
    @Body() body: Partial<UpdateUserDto>
  ) {
    return this.userService.update(request.user.id, body);
  }
}
