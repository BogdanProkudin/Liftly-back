import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { UpdateProfileInput } from './dto/update-profile.dto.js';
import { SearchUsersInput } from './dto/search-users.dto.js';
import {
  UserProfileResponseDto,
  PublicProfileResponseDto,
  UserStatsResponseDto,
  SearchUserResultDto,
} from './dto/user-response.dto.js';

const USER_PROFILE_SELECT = {
  id: true,
  email: true,
  name: true,
  username: true,
  avatarUrl: true,
  bio: true,
} as const;

const PUBLIC_PROFILE_SELECT = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
  bio: true,
} as const;

const SEARCH_RESULT_SELECT = {
  id: true,
  name: true,
  username: true,
  avatarUrl: true,
} as const;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string): Promise<UserProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: USER_PROFILE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(
    userId: string,
    data: UpdateProfileInput,
  ): Promise<UserProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: USER_PROFILE_SELECT,
    });

    this.logger.debug(`Profile updated for user ${userId}`);

    return updated;
  }

  async getStats(userId: string): Promise<UserStatsResponseDto> {
    const [workoutAggregate, totalSets] = await Promise.all([
      this.prisma.workout.aggregate({
        where: { userId },
        _count: { id: true },
        _sum: { totalVolume: true },
      }),
      this.prisma.workoutSet.count({
        where: { workout: { userId } },
      }),
    ]);

    return {
      totalWorkouts: workoutAggregate._count.id,
      totalVolume: workoutAggregate._sum.totalVolume ?? 0,
      totalSets,
    };
  }

  async getPublicProfile(id: string): Promise<PublicProfileResponseDto> {
    const user = await this.prisma.user.findUnique({
      where: { id, isPublic: true },
      select: PUBLIC_PROFILE_SELECT,
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async searchUsers(
    userId: string,
    input: SearchUsersInput,
  ): Promise<{
    data: SearchUserResultDto[];
    meta: { pagination: { nextCursor: string | null; hasMore: boolean } };
  }> {
    const limit = input.limit ?? 20;

    const users = await this.prisma.user.findMany({
      where: {
        isPublic: true,
        id: { not: userId },
        OR: [
          { name: { contains: input.query, mode: 'insensitive' } },
          { username: { contains: input.query, mode: 'insensitive' } },
        ],
      },
      orderBy: { username: 'asc' },
      take: limit + 1,
      ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      select: SEARCH_RESULT_SELECT,
    });

    const hasMore = users.length > limit;
    const items = users.slice(0, limit);
    const nextCursor = hasMore ? items[items.length - 1]?.id : null;

    return {
      data: items,
      meta: { pagination: { nextCursor, hasMore } },
    };
  }

  async deleteAccount(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    await this.prisma.user.delete({
      where: { id: userId },
    });

    this.logger.log(`Account deleted for user ${userId}`);
  }
}
