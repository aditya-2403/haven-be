import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { StoredFile, StoredFileSchema } from './schemas/stored-file.schema';
import { MongodbStorageProvider } from './providers/mongodb-storage.provider';
import { StorageController } from './storage.controller';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: StoredFile.name, schema: StoredFileSchema }]),
  ],
  controllers: [StorageController],
  providers: [MongodbStorageProvider],
  exports: [MongodbStorageProvider],
})
export class StorageModule {}

