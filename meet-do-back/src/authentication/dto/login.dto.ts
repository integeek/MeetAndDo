/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsEmail()
  readonly email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
export default LoginDto;
