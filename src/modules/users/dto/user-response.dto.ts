import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UserProfileResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'john@example.com' })
  email!: string;

  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: 'johndoe' })
  username!: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ example: 'Fitness enthusiast', nullable: true })
  bio!: string | null;
}

export class PublicProfileResponseDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: 'johndoe' })
  username!: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatarUrl!: string | null;

  @ApiPropertyOptional({ example: 'Fitness enthusiast', nullable: true })
  bio!: string | null;
}

export class UserStatsResponseDto {
  @ApiProperty({ example: 42 })
  totalWorkouts!: number;

  @ApiProperty({ example: 150000 })
  totalVolume!: number;

  @ApiProperty({ example: 520 })
  totalSets!: number;
}

export class SearchUserResultDto {
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  id!: string;

  @ApiProperty({ example: 'John Doe' })
  name!: string;

  @ApiProperty({ example: 'johndoe' })
  username!: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.jpg', nullable: true })
  avatarUrl!: string | null;
}
