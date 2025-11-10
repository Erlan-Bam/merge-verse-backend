import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import {
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { TelegramAuthDto } from './dto/telegram-auth.dto';
import { User } from 'src/shared/decorator/user.decorator';
import { CreateEmailDto } from './dto/create-email.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateCryptoWalletDto } from './dto/update-crypto-wallet.dto';
import { UserGuard } from 'src/shared/guards/user.guard';
import { AuthGuard } from '@nestjs/passport';
import { CollectionService } from 'src/collection/collection.service';

@Controller('user')
@ApiTags('User')
export class UserController {
  private readonly logger = new Logger(UserController.name);
  constructor(
    private userService: UserService,
    private collectionService: CollectionService,
  ) {}

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
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid initData or validation failed',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async telegram(@Body() data: TelegramAuthDto) {
    try {
      return await this.userService.telegram(data);
    } catch (error) {
      this.logger.error('Failed to authenticate with Telegram: ', error);
      throw error;
    }
  }

  @Get('profile')
  @UseGuards(AuthGuard('jwt'), UserGuard)
  async getProfile(@User('id') userId: string) {
    return this.userService.getProfile(userId);
  }

  @Get('inventory')
  @ApiOperation({
    summary: 'Get user collection',
    description:
      "Retrieves the authenticated user's complete collection of gifts with their levels and quantities.",
  })
  @ApiResponse({
    status: 200,
    description: 'Collection retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        collection: {
          type: 'array',
          description: 'Array of items in the user collection',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', description: 'Item ID' },
              level: {
                type: 'string',
                enum: [
                  'L0',
                  'L1',
                  'L2',
                  'L3',
                  'L4',
                  'L5',
                  'L6',
                  'L7',
                  'L8',
                  'L9',
                  'L10',
                ],
                description: 'Item level',
              },
              quantity: {
                type: 'number',
                description: 'Number of items at this level',
              },
              isTradeable: {
                type: 'boolean',
                description: 'Whether the item is tradeable',
              },
              gift: {
                type: 'object',
                properties: {
                  id: { type: 'string', description: 'Gift ID' },
                  name: { type: 'string', description: 'Gift name' },
                  rarity: {
                    type: 'string',
                    enum: ['COMMON', 'RARE', 'EPIC', 'LEGENDARY', 'MYTHIC'],
                    description: 'Gift rarity',
                  },
                  url: { type: 'string', description: 'Gift image URL' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Collection is currently not available',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  @UseGuards(AuthGuard('jwt'), UserGuard)
  async getCollection(@User('id') userId: string) {
    return this.collectionService.getCollection(userId);
  }

  @Get('collection/history')
  @UseGuards(AuthGuard('jwt'), UserGuard)
  async getCollectionHistory(@User('id') userId: string) {
    return this.userService.getCollectionHistory(userId);
  }

  @Post('test')
  @ApiOperation({
    summary: 'Test endpoint - Generate token',
    description:
      'Development/testing endpoint to generate a JWT token for a hardcoded user ID. Should not be used in production.',
  })
  @ApiResponse({
    status: 201,
    description: 'Test token generated successfully',
    schema: {
      type: 'object',
      properties: {
        access_token: {
          type: 'string',
          description: 'JWT access token for testing',
        },
      },
    },
  })
  async test() {
    return this.userService.generateToken(
      'd581bb7e-56b1-4050-bcf2-b6afce518bad',
    );
  }

  @Post('email')
  @UseGuards(AuthGuard('jwt'), UserGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Create and verify email',
    description:
      'Associates an email address with the authenticated user account. Each user can only have one email. A verification code will be sent to the provided email address.',
  })
  @ApiBody({ type: CreateEmailDto })
  @ApiResponse({
    status: 201,
    description: 'Email created and verification code sent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Verification code sent to your email',
        },
        email: {
          type: 'string',
          example: 'user@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - User already has an email or email is already taken',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - User not found',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async createEmail(
    @User('id') userId: string,
    @Body() createEmailDto: CreateEmailDto,
  ) {
    try {
      return await this.userService.createEmail(userId, createEmailDto);
    } catch (error) {
      this.logger.error('Failed to create email: ', error);
      throw error;
    }
  }

  @Post('email/resend-code')
  @UseGuards(AuthGuard('jwt'), UserGuard)
  @ApiBearerAuth('JWT')
  @ApiOperation({
    summary: 'Resend verification code',
    description:
      "Resends a new verification code to the user's existing email address. This endpoint can only be used if the user already has an email associated with their account that is not yet verified.",
  })
  @ApiResponse({
    status: 201,
    description: 'Verification code resent successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Verification code resent to your email',
        },
        email: {
          type: 'string',
          example: 'user@example.com',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Email is already verified',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - No email found for this user',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async resendVerificationCode(@User('id') userId: string) {
    try {
      return await this.userService.resendVerificationCode(userId);
    } catch (error) {
      this.logger.error('Failed to resend verification code: ', error);
      throw error;
    }
  }

  @Post('email/verify')
  @UseGuards(AuthGuard('jwt'), UserGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify email with code',
    description:
      "Verifies the user's email address using the 6-digit verification code sent to their email. Once verified, the code is removed and the email is marked as verified.",
  })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Email verified successfully',
        },
        email: {
          type: 'string',
          example: 'user@example.com',
        },
        isVerified: {
          type: 'boolean',
          example: true,
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad Request - Invalid code, already verified, or no code found',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - No email found for this user',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async verifyEmail(
    @User('id') userId: string,
    @Body() verifyEmailDto: VerifyEmailDto,
  ) {
    try {
      return await this.userService.verifyEmail(userId, verifyEmailDto);
    } catch (error) {
      this.logger.error('Failed to verify email: ', error);
      throw error;
    }
  }

  @Post('crypto-wallet')
  @UseGuards(AuthGuard('jwt'), UserGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create or update crypto wallet',
    description:
      "Creates or updates the cryptocurrency wallet address for the authenticated user. This endpoint works as an upsert - it will create a new wallet address if one doesn't exist, or update the existing one.",
  })
  @ApiBody({ type: UpdateCryptoWalletDto })
  @ApiResponse({
    status: 201,
    description: 'Crypto wallet created/updated successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Crypto wallet updated successfully',
        },
        cryptoWallet: {
          type: 'string',
          example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid wallet address format',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing authentication token',
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  async upsertCryptoWallet(
    @User('id') userId: string,
    @Body() updateCryptoWalletDto: UpdateCryptoWalletDto,
  ) {
    try {
      return await this.userService.upsertCryptoWallet(
        userId,
        updateCryptoWalletDto,
      );
    } catch (error) {
      this.logger.error('Failed to update crypto wallet: ', error);
      throw error;
    }
  }
}
