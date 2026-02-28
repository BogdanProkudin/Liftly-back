import { z } from 'zod';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const UpdateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  bio: z.string().max(500).optional(),
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/).optional(),
});

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe', minLength: 1, maxLength: 100 })
  name?: string;

  @ApiPropertyOptional({ example: 'Fitness enthusiast', maxLength: 500 })
  bio?: string;

  @ApiPropertyOptional({ example: 'johndoe', minLength: 3, maxLength: 30 })
  username?: string;
}
