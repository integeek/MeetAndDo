export class CreateUserDto {
  email: string;
  firstname: string;
  lastname: string;
  password: string;
  role: string;
  enabled: boolean;
  address: string;
}

export default CreateUserDto;
