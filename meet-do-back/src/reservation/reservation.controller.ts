import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ReservationService } from './reservation.service';
import { CreateReservationDto } from './dto/create-reservation.dto';
import { UpdateReservationDto } from './dto/update-reservation.dto';
import JwtAuthenticationGuard from 'src/authentication/guard/jwt-authentication.guard';
import type RequestWithUser from 'src/authentication/requestWithUser.interface';

@Controller('reservation')
export class ReservationController {
  constructor(private readonly reservationService: ReservationService) {}

  @Post()
  create(
    @Body() createReservationDto: CreateReservationDto,
    @Req() request: RequestWithUser,
  ) {
    return this.reservationService.create({
      ...createReservationDto,
      id_user: request.user?.id ?? createReservationDto.id_user,
    });
  }

  @Get()
  findAll() {
    return this.reservationService.findAll();
  }

  @Get('user')
  @UseGuards(JwtAuthenticationGuard)
  findByCurrentUser(@Req() req: RequestWithUser) {
    const userId = req.user.id;
    return this.reservationService.findByUserId(userId);
  }

  @Delete(':id')
  @UseGuards(JwtAuthenticationGuard)
  cancelReservation(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.reservationService.cancelReservation(+id, req.user.id);
  }
}
