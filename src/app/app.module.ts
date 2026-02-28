import { Global, Module } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';
import { UsersModule } from '../modules/users/users.module.js';

@Global()
@Module({
  imports: [UsersModule],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class AppModule {}
