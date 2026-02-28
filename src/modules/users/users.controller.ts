import { Controller, Get, Delete, Body, Patch, Param, Query, ParseUUIDPipe } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { UsersService } from './users.service.js';
import { UpdateProfileDto } from './dto/update-profile.dto.js';
import { SearchUsersDto } from './dto/search-users.dto.js';
import {
  UserProfileResponseDto,
  PublicProfileResponseDto,
  UserStatsResponseDto,
  SearchUserResultDto,
} from './dto/user-response.dto.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile', type: UserProfileResponseDto })
  async getProfile(@CurrentUser() userId: string): Promise<UserProfileResponseDto> {
    return this.usersService.getProfile(userId);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Updated profile', type: UserProfileResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @CurrentUser() userId: string,
    @Body() dto: UpdateProfileDto,
  ): Promise<UserProfileResponseDto> {
    return this.usersService.updateProfile(userId, dto);
  }

  @Get('me/stats')
  @ApiOperation({ summary: 'Get current user workout statistics' })
  @ApiResponse({ status: 200, description: 'User stats', type: UserStatsResponseDto })
  async getStats(@CurrentUser() userId: string): Promise<UserStatsResponseDto> {
    return this.usersService.getStats(userId);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search public users by name or username' })
  @ApiResponse({ status: 200, description: 'Search results', type: [SearchUserResultDto] })
  async searchUsers(
    @CurrentUser() userId: string,
    @Query() dto: SearchUsersDto,
  ) {
    return this.usersService.searchUsers(userId, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get public user profile' })
  @ApiParam({ name: 'id', type: String, description: 'User ID' })
  @ApiResponse({ status: 200, description: 'Public profile', type: PublicProfileResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getPublicProfile(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<PublicProfileResponseDto> {
    return this.usersService.getPublicProfile(id);
  }

  @Delete('me')
  @ApiOperation({ summary: 'Delete current user account' })
  @ApiResponse({ status: 200, description: 'Account deleted' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async deleteAccount(@CurrentUser() userId: string): Promise<void> {
    return this.usersService.deleteAccount(userId);
  }
}
