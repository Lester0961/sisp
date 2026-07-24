import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { KnowledgeBaseController } from './knowledge-base.controller';
import { AdminService } from './admin.service';
import { UsersModule } from '../users/users.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [UsersModule, DocumentsModule],
  controllers: [AdminController, KnowledgeBaseController],
  providers: [AdminService],
})
export class AdminModule {}
