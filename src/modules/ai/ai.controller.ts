import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { Product } from '../../entities/product.entity';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate-product')
  generateProduct(
    @Body() body: { name?: string; category?: string; context?: string },
  ): Promise<Partial<Product>> {
    const input = body.context || body.name || '';
    return this.aiService.extractProduct(input);
  }
}
