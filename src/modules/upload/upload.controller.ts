import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as ftp from 'basic-ftp';
import { Readable } from 'stream';
import * as path from 'path';

@Controller('upload')
export class UploadController {
  private readonly logger = new Logger(UploadController.name);

  @Post()
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file provided. Send a multipart/form-data request with a "file" field.');
    }

    const ftpHost = process.env.BEGET_FTP_HOST;
    const ftpUser = process.env.BEGET_FTP_USER;
    const ftpPass = process.env.BEGET_FTP_PASS;
    const ftpDir = process.env.BEGET_FTP_UPLOAD_DIR || '/public_html/uploads';
    const baseUrl = (process.env.BEGET_PUBLIC_BASE_URL || '').replace(/\/$/, '');

    if (!ftpHost || !ftpUser || !ftpPass || !baseUrl) {
      throw new InternalServerErrorException('FTP configuration is missing. Set BEGET_FTP_HOST, BEGET_FTP_USER, BEGET_FTP_PASS, BEGET_PUBLIC_BASE_URL environment variables.');
    }

    // Generate a unique filename preserving the original extension
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const uniqueName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${ext}`;
    const remotePath = `${ftpDir}/${uniqueName}`;

    const client = new ftp.Client(30_000); // 30s timeout
    client.ftp.verbose = false;

    try {
      await client.access({
        host: ftpHost,
        user: ftpUser,
        password: ftpPass,
        secure: false,
      });

      // Ensure the target directory exists on Beget
      await client.ensureDir(ftpDir);

      // Upload file buffer as a readable stream
      const stream = Readable.from(file.buffer);
      await client.uploadFrom(stream, remotePath);

      this.logger.log(`Uploaded ${uniqueName} → ${remotePath}`);
    } catch (err) {
      this.logger.error('FTP upload failed', err);
      throw new InternalServerErrorException(`FTP upload failed: ${(err as Error).message}`);
    } finally {
      client.close();
    }

    return {
      url: `${baseUrl}/${uniqueName}`,
      filename: uniqueName,
    };
  }
}
