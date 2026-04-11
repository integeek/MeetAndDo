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
        subject: 'Confirm your registration on Meet&Do !',
        html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">

            <div style="width:100%; background-color:#004AAD; padding:20px 0; text-align:center;">
                <h1 style="color:white; margin:0; font-size:2rem; letter-spacing:1px;">Meet&Do</h1>
            </div>

            <div style="max-width:600px; margin:30px auto; background-color:white; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                <div style="padding:40px;">
                    <h3 style="text-align:center; color:#004AAD; font-size:1.4rem; margin-bottom:30px;">
                        Welcome to Meet&Do 🎉
                    </h3>

                    <p style="color:#333;">Hello,</p>
                    <p style="color:#555; line-height:1.6;">
                        Thank you for registering on <strong>Meet&Do</strong>. 
                        We are delighted to welcome you !
                    </p>
                    <p style="color:#555; line-height:1.6;">
                        To finalize your registration and activate your account, click on the button below.
                    </p>

                    <div style="text-align:center; margin:35px 0;">
                        <a href="http://127.0.0.1:5500/meet-do-front/Page/PersonalInformation.html?token=${verificationToken}"
                          style="background-color:#004AAD; color:white; padding:14px 32px; border-radius:25px; 
                                  text-decoration:none; font-size:1rem; font-weight:bold; display:inline-block;">
                            Activate my account →
                        </a>
                    </div>

                    <p style="color:#999; font-size:0.85rem; text-align:center;">
                        If you did not initiate this registration, simply ignore this message.
                    </p>

                    <div style="border-top:1px solid #e0e0e0; margin:30px 0;"></div>

                    <p style="color:#555; text-align:center; font-size:0.9rem;">
                        Our team remains at your disposal for any questions.<br>
                        <strong>Phone :</strong> +33 6 07 46 76 89 &nbsp;|&nbsp; 
                        <strong>Email :</strong> meetanddosav@gmail.com
                    </p>
                </div>

                <div style="background-color:#f9f9f9; padding:20px; text-align:center; border-top:1px solid #e0e0e0;">
                    <p style="color:#999; font-size:0.85rem; margin-bottom:15px;">Stay connected !</p>
                    <div>
                        <a href="https://www.facebook.com" style="margin:0 10px;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/2023_Facebook_icon.svg/960px-2023_Facebook_icon.svg.png" 
                                alt="Facebook" style="width:30px; height:30px;">
                        </a>
                        <a href="https://www.instagram.com" style="margin:0 10px;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/960px-Instagram_icon.png" 
                                alt="Instagram" style="width:30px; height:30px;">
                        </a>
                        <a href="https://www.linkedin.com" style="margin:0 10px;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/LinkedIn_logo_initials.png/960px-LinkedIn_logo_initials.png" 
                                alt="LinkedIn" style="width:30px; height:30px;">
                        </a>
                    </div>
                    <p style="color:#ccc; font-size:0.75rem; margin-top:15px;">© 2026 Meet&Do.</p>
                </div>
            </div>

        </body>
        </html>
        `,
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
    return { message: 'Registration successful, please check your email' };
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
        subject: 'Thank you for registering on Meet&Do !',
        html: `
        <!DOCTYPE html>
        <html>
        <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">

            <div style="width:100%; background-color:#004AAD; padding:20px 0; text-align:center;">
                <h1 style="color:white; margin:0; font-size:2rem; letter-spacing:1px;">Meet&Do</h1>
            </div>

            <div style="max-width:600px; margin:30px auto; background-color:white; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
                <div style="padding:40px;">
                    <h3 style="text-align:center; color:#004AAD; font-size:1.4rem; margin-bottom:30px;">
                        Your account is activated ✅
                    </h3>

                    <p style="color:#333;">Hello ${data.firstname},</p>
                    <p style="color:#555; line-height:1.6;">
                        Your registration on <strong>Meet&Do</strong> has been successfully confirmed.
                        You can now access your account and enjoy all our activities !
                    </p>

                    <div style="text-align:center; margin:35px 0;">
                        <a href="http://127.0.0.1:5500/meet-do-front/Page/Home.html"
                          style="background-color:#004AAD; color:white; padding:14px 32px; border-radius:25px; 
                                  text-decoration:none; font-size:1rem; font-weight:bold; display:inline-block;">
                            Discover the activities →
                        </a>
                    </div>

                    <div style="border-top:1px solid #e0e0e0; margin:30px 0;"></div>

                    <p style="color:#555; text-align:center; font-size:0.9rem;">
                        Our team remains at your disposal for any questions.<br>
                        <strong>Phone :</strong> +33 6 07 46 76 89 &nbsp;|&nbsp; 
                        <strong>Email :</strong> meetanddosav@gmail.com
                    </p>
                </div>

                <div style="background-color:#f9f9f9; padding:20px; text-align:center; border-top:1px solid #e0e0e0;">
                    <p style="color:#999; font-size:0.85rem; margin-bottom:15px;">Restez connecté !</p>
                    <div>
                        <a href="https://www.facebook.com" style="margin:0 10px;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/2023_Facebook_icon.svg/960px-2023_Facebook_icon.svg.png" 
                                alt="Facebook" style="width:30px; height:30px;">
                        </a>
                        <a href="https://www.instagram.com" style="margin:0 10px;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/960px-Instagram_icon.png" 
                                alt="Instagram" style="width:30px; height:30px;">
                        </a>
                        <a href="https://www.linkedin.com" style="margin:0 10px;">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/LinkedIn_logo_initials.png/960px-LinkedIn_logo_initials.png" 
                                alt="LinkedIn" style="width:30px; height:30px;">
                        </a>
                    </div>
                    <p style="color:#ccc; font-size:0.75rem; margin-top:15px;">© 2026 Meet&Do.</p>
                </div>
            </div>

        </body>
        </html>
            `,
     });
    return { message: 'Registration successful' };

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
    return `Authentication=${token}; HttpOnly; Path=/; Max-Age=${this.configService.get('JWT_EXPIRATION_TIME')}; SameSite=Lax`;
  }

  public async requestResetPassword(data: RequestResetPasswordDto) {
    const user = await this.userService.getByEmail(data.email);
    const resetToken = crypto.randomUUID();
    await this.userService.update(user.id, {
      verification_token: resetToken,
    });

   await this.mailerService.sendMail({
    to: user.email,
    subject: 'Reset your Meet&Do password',
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0; padding:0; background-color:#f4f4f4; font-family: Arial, sans-serif;">

          <div style="width:100%; background-color:#004AAD; padding:20px 0; text-align:center;">
              <h1 style="color:white; margin:0; font-size:2rem; letter-spacing:1px;">Meet&Do</h1>
          </div>

          <div style="max-width:600px; margin:30px auto; background-color:white; border-radius:10px; overflow:hidden; box-shadow:0 2px 10px rgba(0,0,0,0.1);">
              <div style="padding:40px;">
                  <h3 style="text-align:center; color:#004AAD; font-size:1.4rem; margin-bottom:30px;">
                      Password reset 🔐
                  </h3>

                  <p style="color:#333;">Bonjour,</p>
                  <p style="color:#555; line-height:1.6;">
                      You have requested to reset your account password <strong>Meet&Do</strong>.
                  </p>
                  <p style="color:#555; line-height:1.6;">
                      Click the button below to choose a new password. 
                  </p>

                  <div style="text-align:center; margin:35px 0;">
                      <a href="http://127.0.0.1:5500/meet-do-front/Page/NewPassword.html?token=${resetToken}"
                        style="background-color:#004AAD; color:white; padding:14px 32px; border-radius:25px; 
                                text-decoration:none; font-size:1rem; font-weight:bold; display:inline-block;">
                          Reset my password →
                      </a>
                  </div>

                  <p style="color:#999; font-size:0.85rem; text-align:center;">
                      If you did not initiate this request, simply ignore this message.
                      Your password will not be changed.
                  </p>

                  <div style="border-top:1px solid #e0e0e0; margin:30px 0;"></div>

                  <p style="color:#555; text-align:center; font-size:0.9rem;">
                      Our team remains at your disposal for any questions.<br>
                      <strong>Phone :</strong> +33 6 07 46 76 89 &nbsp;|&nbsp; 
                      <strong>Email :</strong> meetanddo@gmail.com
                  </p>
              </div>

              <div style="background-color:#f9f9f9; padding:20px; text-align:center; border-top:1px solid #e0e0e0;">
                  <p style="color:#999; font-size:0.85rem; margin-bottom:15px;">Stay connected !</p>
                  <div>
                      <a href="https://www.facebook.com" style="margin:0 10px;">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/b/b9/2023_Facebook_icon.svg/960px-2023_Facebook_icon.svg.png" 
                              alt="Facebook" style="width:30px; height:30px;">
                      </a>
                      <a href="https://www.instagram.com" style="margin:0 10px;">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/a/a5/Instagram_icon.png/960px-Instagram_icon.png" 
                              alt="Instagram" style="width:30px; height:30px;">
                      </a>
                      <a href="https://www.linkedin.com" style="margin:0 10px;">
                          <img src="https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/LinkedIn_logo_initials.png/960px-LinkedIn_logo_initials.png" 
                              alt="LinkedIn" style="width:30px; height:30px;">
                      </a>
                  </div>
                  <p style="color:#ccc; font-size:0.75rem; margin-top:15px;">© 2026 Meet&Do.</p>
              </div>
          </div>

      </body>
      </html>
          `,
      });
    return { message: 'Please check your email' };
  }

  public async resetPassword(data: ResetPasswordDto) {
    const user = await this.userService.getByVerificationToken(data.verification_token);
    const hashedPassword = await bcrypt.hash(data.password, 10);

    await this.userService.update(user.id, {
      password: hashedPassword,
      verification_token: '',
    });
    return { message: 'Your password has been successfully changed.' };
  }
}