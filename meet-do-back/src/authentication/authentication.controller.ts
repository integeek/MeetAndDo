import {
  Controller,
  Get,
  Post,
  Body,
  Res,
  UseGuards,
  Req,
  HttpCode,
} from '@nestjs/common';
import * as express from 'express';
import { AuthenticationService } from './authentication.service';
import { JwtService } from '@nestjs/jwt';
import RegisterDto from './dto/register.dto';
import JwtAuthenticationGuard from './guard/jwt-authentication.guard';
import { LocalAuthenticationGuard } from './guard/localAuthentication.guard';
import type RequestWithUser from './requestWithUser.interface';
import CompleteRegisterDto from './dto/complete-register.dto';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

@Controller('authentication')
export class AuthenticationController {
  constructor(
    private readonly authenticationService: AuthenticationService, 
    private readonly jwtService : JwtService
  ) {}

  @Post('register')
  async register(@Body() registrationData: RegisterDto) {
    return this.authenticationService.register(registrationData);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Post('log-out')
  async logOut(
    @Req() request: RequestWithUser,
    @Res() response: express.Response,
  ) {
    response.setHeader(
      'Set-Cookie',
      this.authenticationService.getCookieForLogOut(),
    );
    return response.sendStatus(200);
  }

  // @UseGuards(JwtAuthenticationGuard)
  // @Get()
  // authenticate(@Req() request: RequestWithUser) {
  //   const user = request.user;
  //   user.password = '';
  //   return user;
  // }

  @HttpCode(200)
  @UseGuards(LocalAuthenticationGuard)
  @Post('login')
  async logIn(
    @Req() request: RequestWithUser,
    @Res() response: express.Response,
  ) {
    const { user } = request;

    if (!user.enabled) {
      return response.status(403).send('User is disabled');
    }

    const cookie = this.authenticationService.getCookieWithJwtToken(user.id, user.role);
    response.setHeader('Set-Cookie', cookie);
    user.password = '';
    return response.send(user);
  }

  @UseGuards(JwtAuthenticationGuard)
  @Get('me')
  authenticate(@Req() request: RequestWithUser) {
    return request.user;
  }

  @Post('complete-profile')
  async completeProfile(@Body() data: CompleteRegisterDto) {
    return this.authenticationService.completeProfile(data);
  }

  @Post('request-reset-password')
  async requestResetPassword(@Body() data: RequestResetPasswordDto) {
    return this.authenticationService.requestResetPassword(data);
  }

  @Post('reset-password')
  async resetPassword(@Body() data: ResetPasswordDto) {
    return this.authenticationService.resetPassword(data);
  }
}
