import { Body, Controller, Logger, Post } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBody, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { TelegramAuthDto } from './dto/telegram-auth.dto';

@Controller('user')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(private userService: UserService) {}

  @Post('telegram')
  @ApiOperation({
    summary: 'Authenticate with Telegram Web App',
    description:
      'Authenticate a user using Telegram Web App initData and receive a JWT token. The initData is validated to ensure it comes from Telegram and has not been tampered with.',
  })
  @ApiBody({ type: TelegramAuthDto })
  @ApiResponse({
    status: 200,
    description: 'Authentication successful - JWT token returned',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: 'JWT access token for API authentication',
        },
      },
    },
  })
  async telegram(@Body() data: TelegramAuthDto) {
    try {
      return await this.userService.telegram(data);
    } catch (error) {
      this.logger.error('Failed to authenticate with Telegram: ', error);
      throw error;
    }
  }
}
