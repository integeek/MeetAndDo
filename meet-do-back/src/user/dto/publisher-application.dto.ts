import { Type } from 'class-transformer';
import { IsOptional, IsString, ValidateNested } from 'class-validator';

export class PublisherApplicationDetailsDto {
  @IsOptional()
  @IsString()
  experienceLevel?: string;

  @IsOptional()
  @IsString()
  activityCategory?: string;

  @IsOptional()
  @IsString()
  motivation?: string;

  @IsOptional()
  @IsString()
  activityPlan?: string;

  @IsOptional()
  @IsString()
  links?: string;
}

export class PublisherApplicationDto {
  @IsOptional()
  @IsString()
  firstname?: string;

  @IsOptional()
  @IsString()
  lastname?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => PublisherApplicationDetailsDto)
  application?: PublisherApplicationDetailsDto;
}
