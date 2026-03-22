/* eslint-disable @typescript-eslint/no-unsafe-call */
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString()
  @IsNotEmpty()
  readonly lastname: string;

  @IsString()
  @IsNotEmpty()
  readonly firstname: string;

  @IsString()
  @IsNotEmpty()
  readonly email: string;

  @MinLength(12)
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  readonly address: string;
}

export default RegisterDto;
