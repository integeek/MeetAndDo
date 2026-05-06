import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ContactCategorie, ContactPriorite } from './create-contact.dto';

export class FilterContactDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;

  @IsOptional()
  @IsEnum(ContactCategorie)
  categorie?: ContactCategorie;

  @IsOptional()
  @IsEnum(ContactPriorite)
  priorite?: ContactPriorite;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  lu?: boolean;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  repondu?: boolean;

  @IsOptional()
  @IsString()
  search?: string;
}
