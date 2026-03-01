import { Global, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service.js';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { WorkoutsModule } from '../modules/workouts/workouts.module.js';

@Global()
@Module({
  imports: [WorkoutsModule],
  providers: [
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
