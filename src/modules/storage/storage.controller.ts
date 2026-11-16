import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UseGuards,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { MongodbStorageProvider } from './providers/mongodb-storage.provider';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CurrentUserPayload } from '../../common/interfaces/current-user.interface';

@ApiTags('Storage')
@Controller('storage')
export class StorageController {
  constructor(private readonly storageProvider: MongodbStorageProvider) {}

  @Post('upload')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload an image or document' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    const meta = await this.storageProvider.upload(file, user.organizationId, user.userId);
    return {
      message: 'File uploaded successfully',
      data: meta,
    };
  }

  @Get(':fileId')
  @ApiOperation({ summary: 'Download or stream stored file' })
  async getFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const file = await this.storageProvider.get(fileId);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${file.filename}"`);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    return res.status(HttpStatus.OK).send(file.buffer);
  }

  @Delete(':fileId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete stored file' })
  async deleteFile(@Param('fileId') fileId: string) {
    await this.storageProvider.delete(fileId);
    return { message: 'File deleted successfully' };
  }
}

