import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { ReviewService } from './review.service';
import JwtAuthenticationGuard from '../authentication/guard/jwt-authentication.guard';

@Controller('review')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get('activity/:id')
  getReviewsByActivity(@Param('id') id: string) {
    return this.reviewService.getReviewsByActivity(Number(id));
  }

  @Post()
  @UseGuards(JwtAuthenticationGuard)
  submitReview(
    @Req() req: any,
    @Body() body: { id_activity: number; rating: number; comment: string },
  ) {
    return this.reviewService.submitReview(body, req.user.id);
  }

  @Get('publisher')
  @UseGuards(JwtAuthenticationGuard)
  getPublisherReviews(@Req() req: any) {
    return this.reviewService.getReviewsByPublisher(req.user.id);
  }
}
