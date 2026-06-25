import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BrandsService } from './brands.service';
import { Brand } from '../../entities/brand.entity';

@Controller('brands')
export class BrandsController {
  constructor(private readonly brandsService: BrandsService) {}

  @Get()
  findAll(): Promise<Brand[]> {
    return this.brandsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Brand> {
    return this.brandsService.findOne(id);
  }

  @Post()
  create(
    @Body() body: { id?: string; name: string; logo?: string },
  ): Promise<Brand> {
    const slug = body.id || body.name.toLowerCase().replace(/\s+/g, '-');
    return this.brandsService.create(slug, body.name, body.logo || body.name);
  }

  @Put(':id')
  update(
    @Param('id') id: string,
    @Body() body: { name: string; logo?: string },
  ): Promise<Brand> {
    return this.brandsService.update(id, body.name, body.logo || body.name);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.brandsService.remove(id);
  }
}
