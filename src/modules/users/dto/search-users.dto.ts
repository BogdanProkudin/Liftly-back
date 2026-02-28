import { z } from 'zod';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const SearchUsersSchema = z.object({
  query: z.string().min(1).max(100),
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export type SearchUsersInput = z.infer<typeof SearchUsersSchema>;

export class SearchUsersDto {
  @ApiProperty({ example: 'john', minLength: 1, maxLength: 100, description: 'Search term for name or username' })
  query!: string;

  @ApiPropertyOptional({ type: String, format: 'uuid', description: 'Cursor ID for pagination' })
  cursor?: string;

  @ApiPropertyOptional({ type: Number, example: 20, minimum: 1, maximum: 50 })
  limit?: number;
}
