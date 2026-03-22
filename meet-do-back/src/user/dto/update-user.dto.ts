import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  lastname?: string;
  firstname?: string;
  email?: string;
  password?: string;
  role?: string;
  enabled?: boolean;
  address?: string;
}
