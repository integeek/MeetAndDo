import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { UserService } from 'src/user/user.service';
import { RegisterDto } from './dto/register.dto';
import * as bcrypt from 'bcrypt';
import CreateUserDto from 'src/user/dto/create-user.dto';
import { JwtService } from '@nestjs/jwt';
import { JwtPayload } from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '@nestjs-modules/mailer';
import CompleteRegisterDto from './dto/complete-register.dto';
import { RequestResetPasswordDto } from './dto/request-reset-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';

enum PostgresErrorCode {
  UniqueViolation = '23505',
}

@Injectable()
export class AuthenticationService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {}

  public async register(registrationData: RegisterDto) {
    const hashedPassword = await bcrypt.hash(registrationData.password, 10);
    const verificationToken = crypto.randomUUID();
    try {
      const createUserDto: CreateUserDto = {
        email: registrationData.email,
        password: hashedPassword,
        role: 'USER',
        enabled: false,
        verification_token: verificationToken,
      };
      const createdUser = await this.userService.create(createUserDto);
      await this.mailerService.sendMail({
        to: createdUser.email,
        subject: 'Confirmez votre inscription sur Meet&Do !',
        text: `Bonjour, votre compte a bien été créé. Afin de le valider, merci de cliquer sur le lien suivant : .../complete-registration?token=${verificationToken}`,
      });

      createdUser.password = '';
    } catch (error) {
      if (error?.code === PostgresErrorCode.UniqueViolation) {
        throw new HttpException(
          'User with that email already exists',
          HttpStatus.BAD_REQUEST,
        );
      }
      throw new HttpException(
        'Something went wrong',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  public async completeProfile(data: CompleteRegisterDto) {
    const user = await this.userService.getByVerificationToken(data.verificationToken);
    if (!user) {
      throw new HttpException('Invalid or expired token', HttpStatus.BAD_REQUEST);
    }

    await this.userService.update(user.id, {
      lastname: data.lastname,
      firstname: data.firstname,
      address: data.address,
      enabled: true,
      verification_token: '',
    });
    await this.mailerService.sendMail({
        to: user.email,
        subject: 'Merci pour votre inscription sur Meet&Do !',
        text: `Bonjour ${data.firstname}, votre inscription a bien été confirmée.`
     });
  }

  public getCookieForLogOut() {
    return `Authentication=; HttpOnly; Path=/; Max-Age=0`;
  }

  public async getAuthenticatedUser(email: string, plainTextPassword: string) {
    try {
      const user = await this.userService.getByEmail(email);
      await this.verifyPassword(plainTextPassword, user.password);
      user.password = '';
      return user;
    } catch (error) {
      throw new HttpException(
        'Wrong credentials provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async verifyPassword(
    plainTextPassword: string,
    hashedPassword: string,
  ) {
    const isPasswordMatching = await bcrypt.compare(
      plainTextPassword,
      hashedPassword,
    );
    if (!isPasswordMatching) {
      throw new HttpException(
        'Wrong credentials provided',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  public getCookieWithJwtToken(userId: number, role: string) {
    const payload: JwtPayload = { userId, role };
    const token = this.jwtService.sign(payload);
    return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get(
      'JWT_EXPIRATION_TIME',
    )}`;
  }

  // authentication.service.ts
  public async requestResetPassword(data: RequestResetPasswordDto) {
    const user = await this.userService.getByEmail(data.email);
    const resetToken = crypto.randomUUID();
    await this.userService.update(user.id, {
      verification_token: resetToken,
    });

    await this.mailerService.sendMail({
      to: user.email,
      subject: 'Réinitialisation de votre mot de passe Meet&Do',
      text: `Cliquez ici pour réinitialiser votre mot de passe :
      http://localhost:3000/authentication/reset-password?token=${resetToken}`,
    });
  }

  public async resetPassword(data: ResetPasswordDto) {
    const user = await this.userService.getByVerificationToken(data.verification_token);
    const hashedPassword = await bcrypt.hash(data.newPassword, 10);

    await this.userService.update(user.id, {
      password: hashedPassword,
      verification_token: '',
    });
  }
}