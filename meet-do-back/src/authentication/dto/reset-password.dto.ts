import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @IsString()
  @IsNotEmpty()
  verification_token: string;

  @MinLength(8)
  @IsString()
  @IsNotEmpty()
  password: string;
}