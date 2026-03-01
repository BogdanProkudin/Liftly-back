import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { WorkoutsService } from './workouts.service.js';
import { CreateWorkoutDto, CreateWorkoutSchema } from './dto/create-workout.dto.js';
import { FinishWorkoutDto, FinishWorkoutSchema } from './dto/finish-workout.dto.js';
import { QueryWorkoutsDto, QueryWorkoutsSchema } from './dto/query-workouts.dto.js';
import { WorkoutResponseDto, WorkoutSummaryDto } from './dto/workout-response.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe.js';

@ApiTags('workouts')
@ApiBearerAuth()
@Controller('workouts')
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get()
  @ApiOperation({ summary: 'List workouts for current user' })
  @ApiResponse({ status: 200, description: 'Paginated workout list', type: [WorkoutSummaryDto] })
  async findAll(
    @CurrentUser() userId: string,
    @Query(new ZodValidationPipe(QueryWorkoutsSchema)) query: QueryWorkoutsDto,
  ) {
    return this.workoutsService.findAll(userId, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get workout by ID with sets' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Workout detail', type: WorkoutResponseDto })
  @ApiResponse({ status: 404, description: 'Workout not found' })
  async findById(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<WorkoutResponseDto> {
    return this.workoutsService.findById(userId, id);
  }

  @Post()
  @ApiOperation({ summary: 'Start a new workout' })
  @ApiBody({ type: CreateWorkoutDto })
  @ApiResponse({ status: 201, description: 'Workout created', type: WorkoutResponseDto })
  @ApiResponse({ status: 400, description: 'Active workout already exists' })
  async create(
    @CurrentUser() userId: string,
    @Body(new ZodValidationPipe(CreateWorkoutSchema)) dto: CreateWorkoutDto,
  ): Promise<WorkoutResponseDto> {
    return this.workoutsService.create(userId, dto);
  }

  @Post(':id/finish')
  @ApiOperation({ summary: 'Finish active workout' })
  @ApiParam({ name: 'id', type: String })
  @ApiBody({ type: FinishWorkoutDto })
  @ApiResponse({ status: 200, description: 'Workout finished', type: WorkoutResponseDto })
  @ApiResponse({ status: 400, description: 'Workout is not in progress' })
  @ApiResponse({ status: 404, description: 'Workout not found' })
  async finish(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(FinishWorkoutSchema)) dto: FinishWorkoutDto,
  ): Promise<WorkoutResponseDto> {
    return this.workoutsService.finish(userId, id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel active workout' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Workout cancelled' })
  @ApiResponse({ status: 404, description: 'Workout not found' })
  async cancel(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.workoutsService.cancel(userId, id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a workout' })
  @ApiParam({ name: 'id', type: String })
  @ApiResponse({ status: 200, description: 'Workout deleted' })
  @ApiResponse({ status: 404, description: 'Workout not found' })
  async delete(
    @CurrentUser() userId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.workoutsService.delete(userId, id);
  }
}
