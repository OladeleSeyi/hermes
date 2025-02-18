import { Controller, Get, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { ApiOkResponse } from '@nestjs/swagger';
import {
  GetSummaryResponseDto,
  GetTopAccountsDto,
  GetTopAccountsResponseDto,
  GetVolumeDto,
  GetVolumeResponseDto,
} from './dto/transactions.dto';

@Controller('transactions')
export class TransactionsController {
  constructor(private transactionsService: TransactionsService) {}

  @Get('/volume')
  @ApiOkResponse({ type: GetVolumeResponseDto })
  async getTotalTransferred(@Query() query: GetVolumeDto) {
    return this.transactionsService.getTotalTransferred(query);
  }

  @Get('/top-accounts')
  @ApiOkResponse({ type: GetTopAccountsResponseDto })
  async getTopAccounts(@Query() query: GetTopAccountsDto) {
    return this.transactionsService.getTopAccounts(query);
  }

  @Get('/summary')
  @ApiOkResponse({ type: GetSummaryResponseDto })
  async summary() {
    return this.transactionsService.getSummary();
  }
}
