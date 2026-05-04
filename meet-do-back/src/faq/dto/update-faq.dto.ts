import { PartialType } from '@nestjs/mapped-types';
import { CreateFaqDto } from './create-faq.dto';
import { IsString } from 'class-validator';

export class UpdateFaqDto extends PartialType(CreateFaqDto) {
    @IsString()
    question?: string;
    
    @IsString()
    answer?: string;
}
