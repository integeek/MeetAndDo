import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { FaqService } from './faq.service';
import { Faq } from './entities/faq.entity';
import { CreateFaqDto } from './dto/create-faq.dto';
import { UpdateFaqDto } from './dto/update-faq.dto';

@Controller('faq')
export class FaqController {
  constructor(private readonly faqService: FaqService) {}
  @Get()
  getAll(): Promise<Faq[]> {
    return this.faqService.getAll();
  }
  @Post()
  create(@Body() dto: CreateFaqDto): Promise<Faq> {
    return this.faqService.create(dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: number,
    @Body() body: Partial<UpdateFaqDto>
  ) {
    return this.faqService.update(id, body);
  }

  @Delete(':id')
  async delete(@Param('id') id: number) {
    return this.faqService.delete(id);
  }
}
