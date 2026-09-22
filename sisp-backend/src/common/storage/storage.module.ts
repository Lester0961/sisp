import { Global, Module } from '@nestjs/common';
import { ObjectStorageService } from './object-storage.service';

/** Global private object storage (Supabase Storage or local fallback). */
@Global()
@Module({
  providers: [ObjectStorageService],
  exports: [ObjectStorageService],
})
export class StorageModule {}
