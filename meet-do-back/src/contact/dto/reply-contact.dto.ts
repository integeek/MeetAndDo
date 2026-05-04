import { IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class ReplyContactDto {
  @IsString()
  @IsNotEmpty({ message: 'La réponse est obligatoire.' })
  @MinLength(10, { message: 'La réponse doit contenir au moins 10 caractères.' })
  @MaxLength(5000, { message: 'La réponse ne peut pas dépasser 5000 caractères.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  reponse: string;
}
