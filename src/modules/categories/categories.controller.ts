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
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { Category } from '../../entities/category.entity';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get()
  findAll(): Promise<Category[]> {
    return this.categoriesService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<Category> {
    return this.categoriesService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  create(
    @Body() body: { id?: string; name: string; parentId?: string },
  ): Promise<Category> {
    const slug = body.id || body.name.toLowerCase().replace(/\s+/g, '-');
    return this.categoriesService.create(slug, body.name, body.parentId);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @Param('id') id: string,
    @Body() body: { name: string },
  ): Promise<Category> {
    return this.categoriesService.update(id, body.name);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string): Promise<void> {
    return this.categoriesService.remove(id);
  }
}
