import { IsBoolean, IsEmail, IsString } from "class-validator";

export class CreateUserDto {
  @IsEmail()
  email?: string;

  @IsString()
  firstname?: string;

  @IsString()
  lastname?: string;

  @IsString()
  password?: string;
  
  role?: string;

  @IsBoolean()  
  enabled?: boolean;

  @IsString()
  address?: string;
  
  @IsString()
  verification_token?: string;
}

export default CreateUserDto;
