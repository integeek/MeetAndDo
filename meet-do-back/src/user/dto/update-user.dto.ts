import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsBoolean, IsEmail, IsString, IsStrongPassword } from 'class-validator';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  @IsString()
  lastname?: string;

  @IsString()
  firstname?: string;

  @IsEmail()
  email?: string;

  @IsString()
  password?: string;

  role?: string;

  @IsBoolean()
  enabled?: boolean;

  @IsString()
  address?: string;
}
