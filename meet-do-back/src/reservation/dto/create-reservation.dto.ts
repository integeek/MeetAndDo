import { IsDateString, IsNumber, IsOptional } from "class-validator";

export class CreateReservationDto {
    @IsDateString()
    date: string;
    
    @IsNumber()
    group_size: number;

    @IsNumber()
    id_user: number;

    @IsOptional()
    @IsNumber()
    id_event?: number;

    @IsOptional()
    @IsNumber()
    id_activity?: number;

    @IsOptional()
    @IsDateString()
    event_date?: string;
}
