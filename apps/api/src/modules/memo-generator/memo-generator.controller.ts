import {
  Controller,
  Post,
  Body,
  Get,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { MemoGeneratorService } from './memo-generator.service';
import { GenerateMemoDto } from './dto/generate-memo.dto';

@Controller('memo-generator')
export class MemoGeneratorController {
  private readonly logger = new Logger(MemoGeneratorController.name);

  constructor(private readonly memoGeneratorService: MemoGeneratorService) {}

  @Post('generate')
  async generateMemo(
    @Body() generateMemoDto: GenerateMemoDto,
    @Res() res: Response,
  ) {
    try {
      const filename = await this.memoGeneratorService.generateMemo(
        generateMemoDto,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        filename,
        downloadUrl: `/generated_memos/${filename}`,
        message: 'Memo generated successfully',
      });
    } catch (error) {
      this.logger.error('Error generating memo:', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: 'Failed to generate memo',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  @Get('board-members')
  getBoardMembers() {
    return {
      success: true,
      boardMembers: this.memoGeneratorService.getBoardMembers(),
    };
  }
}
