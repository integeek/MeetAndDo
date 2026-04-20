import { IsDateString, IsNumber } from "class-validator";

export class CreateReservationDto {
    @IsDateString()
    date: string;
    
    @IsNumber()
    group_size: number;

    @IsNumber()
    id_user: number;

    @IsNumber()
    id_event: number;
}
