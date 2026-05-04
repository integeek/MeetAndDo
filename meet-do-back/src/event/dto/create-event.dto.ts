import { IsDateString, IsNumber } from "class-validator";

export class CreateEventDto {
    @IsDateString()
    date: string;
    
    @IsNumber()
    id_activity: number;
}
