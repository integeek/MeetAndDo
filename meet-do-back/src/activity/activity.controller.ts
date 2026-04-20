import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ActivityService } from './activity.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';

const ALLOWED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
];

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

@Controller('activity')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post('upload-images')
  @UseInterceptors(FilesInterceptor('images', 10))
  async uploadImages(
    @UploadedFiles()
    files: Array<{
      buffer: Buffer;
      originalname: string;
      mimetype: string;
      size: number;
    }>,
  ) {
    if (!files?.length) {
      throw new BadRequestException('Aucune image fournie');
    }

    const invalidType = files.find(
      (file) => !ALLOWED_IMAGE_TYPES.includes(file.mimetype),
    );
    if (invalidType) {
      throw new BadRequestException("Type d'image non autorisé");
    }

    const tooLargeFile = files.find((file) => file.size > MAX_IMAGE_SIZE);
    if (tooLargeFile) {
      throw new BadRequestException('Chaque image doit faire moins de 5 Mo');
    }

    let urls: string[];
    try {
      urls = await this.activityService.uploadImages(files);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : "Échec de l'upload des images",
      );
    }

    return { urls };
  }

  @Post()
  create(@Body() createActivityDto: CreateActivityDto) {
    return this.activityService.create(createActivityDto);
  }

  @Get()
  findAll() {
    return this.activityService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.activityService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateActivityDto: UpdateActivityDto) {
    return this.activityService.update(+id, updateActivityDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.activityService.remove(+id);
  }
}
