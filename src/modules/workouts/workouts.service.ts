import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateWorkoutInput } from './dto/create-workout.dto.js';
import { FinishWorkoutInput } from './dto/finish-workout.dto.js';
import { QueryWorkoutsInput } from './dto/query-workouts.dto.js';
import { WorkoutStatus } from 'prisma/generated/prisma/client';

interface VolumeQueryResult {
  total_volume: number;
}

const WORKOUT_SELECT = {
  id: true,
  name: true,
  notes: true,
  status: true,
  startedAt: true,
  finishedAt: true,
  durationSeconds: true,
  totalVolume: true,
  totalSets: true,
  totalReps: true,
  rating: true,
  createdAt: true,
} as const;

const WORKOUT_SUMMARY_SELECT = {
  id: true,
  name: true,
  status: true,
  startedAt: true,
  durationSeconds: true,
  totalVolume: true,
  totalSets: true,
} as const;

@Injectable()
export class WorkoutsService {
  private readonly logger = new Logger(WorkoutsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(userId: string, query: QueryWorkoutsInput) {
    const limit = query.limit ?? 20;

    const workouts = await this.prisma.workout.findMany({
      where: {
        userId,
        ...(query.status ? { status: query.status as WorkoutStatus } : {}),
      },
      orderBy: { startedAt: 'desc' },
      take: limit + 1,
      ...(query.cursor ? { cursor: { id: query.cursor }, skip: 1 } : {}),
      select: {
        ...WORKOUT_SUMMARY_SELECT,
        _count: { select: { sets: true } },
      },
    });

    const hasMore = workouts.length > limit;
    const items = workouts.slice(0, limit);
    const nextCursor = hasMore ? items[items.length - 1]?.id ?? null : null;

    const data = items.map(({ _count, ...workout }) => ({
      ...workout,
      setsCompleted: _count.sets,
    }));

    this.logger.debug(`Fetched ${data.length} workouts for user ${userId}`);

    return {
      data,
      meta: { pagination: { nextCursor, hasMore } },
    };
  }

  async findById(userId: string, workoutId: string) {
    const workout = await this.prisma.workout.findUnique({
      where: { id: workoutId },
      select: {
        ...WORKOUT_SELECT,
        userId: true,
        sets: {
          select: {
            id: true,
            exerciseId: true,
            setNumber: true,
            setType: true,
            weight: true,
            reps: true,
            durationSeconds: true,
            rpe: true,
            isPersonalRecord: true,
            notes: true,
          },
          orderBy: [{ exerciseId: 'asc' }, { setNumber: 'asc' }],
        },
      },
    });

    if (!workout || workout.userId !== userId) {
      throw new NotFoundException('Workout not found');
    }

    const { userId: _, ...result } = workout;
    return result;
  }

  async create(userId: string, data: CreateWorkoutInput) {
    const activeWorkout = await this.prisma.workout.findFirst({
      where: { userId, status: 'IN_PROGRESS' },
      select: { id: true },
    });

    if (activeWorkout) {
      throw new BadRequestException('You already have an active workout. Finish or cancel it first.');
    }

    const workout = await this.prisma.workout.create({
      data: {
        userId,
        name: data.name ?? null,
        templateId: data.templateId ?? null,
        notes: data.notes ?? null,
        startedAt: new Date(),
        status: 'IN_PROGRESS',
      },
      select: WORKOUT_SELECT,
    });

    this.logger.debug(`Workout ${workout.id} created for user ${userId}`);

    return workout;
  }

  async finish(userId: string, workoutId: string, data: FinishWorkoutInput) {
    const workout = await this.prisma.workout.findUnique({
      where: { id: workoutId },
      select: { id: true, userId: true, status: true, startedAt: true },
    });

    if (!workout || workout.userId !== userId) {
      throw new NotFoundException('Workout not found');
    }

    if (workout.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Workout is not in progress');
    }

    const now = new Date();
    const durationSeconds = Math.floor((now.getTime() - workout.startedAt.getTime()) / 1000);

    // Calculate aggregates from sets
    const aggregates = await this.prisma.workoutSet.aggregate({
      where: { workoutId },
      _count: { id: true },
      _sum: { reps: true },
    });

    // Calculate total volume via raw query
    const volumeResult = await this.prisma.$queryRaw<VolumeQueryResult[]>`
      SELECT COALESCE(SUM(weight * reps), 0) as total_volume
      FROM workout_sets
      WHERE workout_id = ${workoutId}::uuid
    `;

    const totalVolume = Number(volumeResult[0]?.total_volume ?? 0);

    const updated = await this.prisma.workout.update({
      where: { id: workoutId },
      data: {
        status: 'COMPLETED',
        finishedAt: now,
        durationSeconds,
        totalSets: aggregates._count.id,
        totalReps: aggregates._sum.reps ?? 0,
        totalVolume,
        rating: data.rating ?? null,
        perceivedEffort: data.perceivedEffort ?? null,
        notes: data.notes ?? undefined,
      },
      select: WORKOUT_SELECT,
    });

    this.logger.log(`Workout ${workoutId} finished — ${durationSeconds}s, ${totalVolume}kg volume`);

    return updated;
  }

  async cancel(userId: string, workoutId: string): Promise<void> {
    const workout = await this.prisma.workout.findUnique({
      where: { id: workoutId },
      select: { id: true, userId: true, status: true },
    });

    if (!workout || workout.userId !== userId) {
      throw new NotFoundException('Workout not found');
    }

    if (workout.status !== 'IN_PROGRESS') {
      throw new BadRequestException('Only in-progress workouts can be cancelled');
    }

    await this.prisma.workout.update({
      where: { id: workoutId },
      data: { status: 'CANCELLED', finishedAt: new Date() },
    });

    this.logger.debug(`Workout ${workoutId} cancelled by user ${userId}`);
  }

  async delete(userId: string, workoutId: string): Promise<void> {
    const workout = await this.prisma.workout.findUnique({
      where: { id: workoutId },
      select: { id: true, userId: true },
    });

    if (!workout || workout.userId !== userId) {
      throw new NotFoundException('Workout not found');
    }

    await this.prisma.workout.delete({
      where: { id: workoutId },
    });

    this.logger.log(`Workout ${workoutId} deleted by user ${userId}`);
  }
}
