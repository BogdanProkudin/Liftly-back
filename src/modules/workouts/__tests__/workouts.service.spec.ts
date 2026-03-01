import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { WorkoutsService } from '../workouts.service.js';
import { PrismaService } from '../../../database/prisma.service.js';

const USER_ID = '11111111-1111-1111-1111-111111111111';
const OTHER_USER_ID = '22222222-2222-2222-2222-222222222222';
const WORKOUT_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

const mockWorkout = {
  id: WORKOUT_ID,
  name: 'Push Day',
  notes: null,
  status: 'IN_PROGRESS' as const,
  startedAt: new Date('2026-03-01T10:00:00Z'),
  finishedAt: null,
  durationSeconds: null,
  totalVolume: null,
  totalSets: null,
  totalReps: null,
  rating: null,
  createdAt: new Date('2026-03-01T10:00:00Z'),
};

const mockPrisma = {
  workout: {
    findMany: jest.fn(),
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  workoutSet: {
    aggregate: jest.fn(),
  },
  $queryRaw: jest.fn(),
};

describe('WorkoutsService', () => {
  let service: WorkoutsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkoutsService>(WorkoutsService);
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return paginated workouts with setsCompleted', async () => {
      const workouts = [
        { id: 'w1', name: 'Push', status: 'COMPLETED', startedAt: new Date(), durationSeconds: 3600, totalVolume: 5000, totalSets: 12, _count: { sets: 12 } },
        { id: 'w2', name: 'Pull', status: 'COMPLETED', startedAt: new Date(), durationSeconds: 3000, totalVolume: 4000, totalSets: 10, _count: { sets: 10 } },
      ];
      mockPrisma.workout.findMany.mockResolvedValue(workouts);

      const result = await service.findAll(USER_ID, { limit: 20 });

      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toHaveProperty('setsCompleted', 12);
      expect(result.data[0]).not.toHaveProperty('_count');
      expect(result.meta.pagination.hasMore).toBe(false);
      expect(result.meta.pagination.nextCursor).toBeNull();
    });

    it('should set hasMore and nextCursor when more results exist', async () => {
      const workouts = Array.from({ length: 3 }, (_, i) => ({
        id: `w${i}`,
        name: `Workout ${i}`,
        status: 'COMPLETED',
        startedAt: new Date(),
        durationSeconds: 3600,
        totalVolume: 5000,
        totalSets: 12,
        _count: { sets: 12 },
      }));
      mockPrisma.workout.findMany.mockResolvedValue(workouts);

      const result = await service.findAll(USER_ID, { limit: 2 });

      expect(result.data).toHaveLength(2);
      expect(result.meta.pagination.hasMore).toBe(true);
      expect(result.meta.pagination.nextCursor).toBe('w1');
    });

    it('should pass status filter to query', async () => {
      mockPrisma.workout.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, { limit: 20, status: 'COMPLETED' });

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'COMPLETED' }),
        }),
      );
    });

    it('should apply cursor pagination', async () => {
      const cursorId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
      mockPrisma.workout.findMany.mockResolvedValue([]);

      await service.findAll(USER_ID, { limit: 20, cursor: cursorId });

      expect(mockPrisma.workout.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          cursor: { id: cursorId },
          skip: 1,
        }),
      );
    });
  });

  describe('findById', () => {
    it('should return workout with sets when owned by user', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue({
        ...mockWorkout,
        userId: USER_ID,
        sets: [{ id: 's1', exerciseId: 'e1', setNumber: 1, setType: 'WORKING', weight: 100, reps: 8, durationSeconds: null, rpe: 7, isPersonalRecord: false, notes: null }],
      });

      const result = await service.findById(USER_ID, WORKOUT_ID);

      expect(result.id).toBe(WORKOUT_ID);
      expect(result.sets).toHaveLength(1);
      expect(result).not.toHaveProperty('userId');
    });

    it('should throw NotFoundException when workout does not exist', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(null);

      await expect(service.findById(USER_ID, WORKOUT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when workout belongs to another user', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue({
        ...mockWorkout,
        userId: OTHER_USER_ID,
        sets: [],
      });

      await expect(service.findById(USER_ID, WORKOUT_ID)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('should create a workout when no active workout exists', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(null);
      mockPrisma.workout.create.mockResolvedValue(mockWorkout);

      const result = await service.create(USER_ID, { name: 'Push Day' });

      expect(result.id).toBe(WORKOUT_ID);
      expect(mockPrisma.workout.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ userId: USER_ID, name: 'Push Day', status: 'IN_PROGRESS' }),
        }),
      );
    });

    it('should throw BadRequestException when active workout exists', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue({ id: 'existing' });

      await expect(service.create(USER_ID, { name: 'Leg Day' })).rejects.toThrow(BadRequestException);
      expect(mockPrisma.workout.create).not.toHaveBeenCalled();
    });
  });

  describe('finish', () => {
    it('should finish an in-progress workout with calculated aggregates', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue({
        id: WORKOUT_ID,
        userId: USER_ID,
        status: 'IN_PROGRESS',
        startedAt: new Date('2026-03-01T10:00:00Z'),
      });
      mockPrisma.workoutSet.aggregate.mockResolvedValue({
        _count: { id: 5 },
        _sum: { reps: 40 },
      });
      mockPrisma.$queryRaw.mockResolvedValue([{ total_volume: 8000 }]);
      mockPrisma.workout.update.mockResolvedValue({
        ...mockWorkout,
        status: 'COMPLETED',
        finishedAt: new Date(),
        totalSets: 5,
        totalReps: 40,
        totalVolume: 8000,
        rating: 4,
      });

      const result = await service.finish(USER_ID, WORKOUT_ID, { rating: 4 });

      expect(result.status).toBe('COMPLETED');
      expect(mockPrisma.workout.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'COMPLETED',
            totalSets: 5,
            totalReps: 40,
            totalVolume: 8000,
            rating: 4,
          }),
        }),
      );
    });

    it('should throw NotFoundException when workout not found', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(null);

      await expect(service.finish(USER_ID, WORKOUT_ID, {})).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when workout is not in progress', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue({
        id: WORKOUT_ID,
        userId: USER_ID,
        status: 'COMPLETED',
        startedAt: new Date(),
      });

      await expect(service.finish(USER_ID, WORKOUT_ID, {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel an in-progress workout', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue({
        id: WORKOUT_ID,
        userId: USER_ID,
        status: 'IN_PROGRESS',
      });

      await service.cancel(USER_ID, WORKOUT_ID);

      expect(mockPrisma.workout.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'CANCELLED' }),
        }),
      );
    });

    it('should throw NotFoundException when workout not found', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(null);

      await expect(service.cancel(USER_ID, WORKOUT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when workout is not in progress', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue({
        id: WORKOUT_ID,
        userId: USER_ID,
        status: 'COMPLETED',
      });

      await expect(service.cancel(USER_ID, WORKOUT_ID)).rejects.toThrow(BadRequestException);
    });
  });

  describe('delete', () => {
    it('should delete workout owned by user', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue({
        id: WORKOUT_ID,
        userId: USER_ID,
      });

      await service.delete(USER_ID, WORKOUT_ID);

      expect(mockPrisma.workout.delete).toHaveBeenCalledWith({ where: { id: WORKOUT_ID } });
    });

    it('should throw NotFoundException when workout not found', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue(null);

      await expect(service.delete(USER_ID, WORKOUT_ID)).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException when workout belongs to another user', async () => {
      mockPrisma.workout.findUnique.mockResolvedValue({
        id: WORKOUT_ID,
        userId: OTHER_USER_ID,
      });

      await expect(service.delete(USER_ID, WORKOUT_ID)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.workout.delete).not.toHaveBeenCalled();
    });
  });
});
