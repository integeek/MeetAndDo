import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class CompleteRegisterDto {

  @IsString()
  verificationToken: string;

  @IsString()
  @IsNotEmpty()
  lastname: string;

  @IsString()
  @IsNotEmpty()
  firstname: string;

  @IsString()
  address: string;
}
export default CompleteRegisterDto;
