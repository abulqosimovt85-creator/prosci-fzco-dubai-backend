import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import * as multer from 'multer';
import { UploadController } from './upload.controller';

@Module({
  imports: [
    MulterModule.register({
      storage: multer.memoryStorage(),
      limits: { fileSize: 15 * 1024 * 1024 }, // 15MB max
    }),
  ],
  controllers: [UploadController],
})
export class UploadModule {}
