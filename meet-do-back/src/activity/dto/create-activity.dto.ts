import {
  IsString,
  IsNumber,
  IsBoolean,
  IsNotEmpty,
  Min,
  IsOptional,
  IsArray,
  ValidateNested,
  IsDateString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateActivityEventDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsNotEmpty()
  heure: string;
}

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  images?: string[];

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsString()
  @IsNotEmpty()
  theme: string;

  @IsNumber()
  @Min(1)
  group_size: number;

  @IsNumber()
  @Min(0)
  price: number;

  @IsBoolean()
  @IsOptional()
  is_visible?: boolean;

  @IsBoolean()
  @IsOptional()
  is_disabled?: boolean;

  @IsNumber()
  @IsOptional()
  id_user?: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateActivityEventDto)
  @IsOptional()
  eventSlots?: CreateActivityEventDto[];
}
