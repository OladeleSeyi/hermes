import {
  IsDateString,
  IsOptional,
  IsInt,
  IsIn,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class PaginationMetadataDto {
  @ApiProperty({
    description: 'Number of items per page',
    example: 10,
    minimum: 1,
  })
  limit: number;

  @ApiProperty({
    description: 'Current page number',
    example: 1,
    minimum: 1,
  })
  page: number;

  @ApiProperty({
    description: 'Next page number (null if no next page)',
    example: 2,
    nullable: true,
  })
  next: number | null;
}

export class GetTopAccountsDto {
  @IsInt()
  @Type(() => Number)
  @ApiProperty({
    description: 'Limit of top accounts to retrieve',
    default: 10,
  })
  limit: number = 10;

  @IsInt()
  @Type(() => Number)
  @IsOptional()
  @ApiProperty({
    description: 'Page of the list',
    default: 1,
  })
  page: number = 1;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ description: 'Start date for the query', required: false })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ description: 'End date for the query', required: false })
  endDate?: string;

  @IsOptional()
  @ApiProperty({
    description: 'Role of the account in the transaction',
    enum: ['sender', 'recipient'],
    required: false,
  })
  @IsIn(['sender', 'recipient', 'total'])
  as?: 'sender' | 'recipient' | 'total';
}

export class GetTopAccountsResultDto {
  @ApiProperty({
    description: 'Address involved in the transaction (Ethereum format)',
  })
  address: string;

  @ApiProperty({
    description: 'Amount transferred as string',
  })
  volume: string;

  @IsOptional()
  @ApiProperty({
    description: 'Role of the account in the transaction',
    enum: ['sender', 'recipient'],
    required: false,
  })
  @IsIn(['sender', 'recipient'])
  as?: 'sender' | 'recipient';
}

export class GetTopAccountsResponseDto {
  @ApiProperty({
    description: 'List of top accounts',
    type: [GetTopAccountsResultDto],
  })
  data: GetTopAccountsResultDto[];

  @ApiProperty({
    description: 'Response message',
    example: 'success',
  })
  message: string;

  @ApiProperty({
    description: 'Pagination metadata',
    type: PaginationMetadataDto,
  })
  @IsOptional()
  metadata?: PaginationMetadataDto;
}

export class GetVolumeDto {
  @IsOptional()
  @IsDateString()
  @ApiProperty({ description: 'Start date for the query', required: false })
  startDate?: string;

  @IsOptional()
  @IsDateString()
  @ApiProperty({ description: 'End date for the query', required: false })
  endDate?: string;

  @ApiProperty({
    description: 'Address involved in the transaction (Ethereum format)',
    required: false,
  })
  @IsOptional()
  @Matches(/^0x[a-fA-F0-9]{40}$/, {
    message: 'Address must be a valid Ethereum address (0x + 40 hex chars)',
  })
  address?: string;

  @ApiProperty({
    description: 'Role of the account in the transaction',
    enum: ['sender', 'recipient'],
    required: false,
  })
  @IsOptional()
  @IsIn(['sender', 'recipient'])
  as?: 'sender' | 'recipient';
}

export class GetVolumeResultDto {
  @ApiProperty({
    description:
      'Address involved in the transaction (Ethereum format) when supplied',
    required: false,
  })
  address: string;

  @ApiProperty({
    description: 'Amount transferred as number',
  })
  volume: number;

  @IsOptional()
  @ApiProperty({
    description: 'Role of the account in the transaction when specified',
    enum: ['sender', 'recipient'],
    required: false,
  })
  @IsIn(['sender', 'recipient'])
  as?: 'sender' | 'recipient';
}

export class GetVolumeResponseDto {
  @ApiProperty({
    description: 'List of top accounts',
    type: [GetTopAccountsResultDto],
  })
  data: GetVolumeResultDto;
  @ApiProperty({
    description: 'Response message',
    example: 'success',
  })
  message: string;
}

export class TopAccountsTimeframeDto {
  @ApiProperty({
    description: 'Array of top accounts',
    type: [GetTopAccountsResultDto],
  })
  topAccounts: GetTopAccountsResultDto[];

  @ApiProperty({
    description: 'Array of top receivers',
    type: [GetTopAccountsResultDto],
  })
  topRecievers: GetTopAccountsResultDto[];

  @ApiProperty({
    description: 'Array of top senders',
    type: [GetTopAccountsResultDto],
  })
  topSenders: GetTopAccountsResultDto[];
}

export class TopAccountsDto {
  @ApiProperty({
    description: 'Top accounts for all time',
    type: TopAccountsTimeframeDto,
  })
  allTime: TopAccountsTimeframeDto;

  @ApiProperty({
    description: 'Top accounts for today',
    type: TopAccountsTimeframeDto,
  })
  today: TopAccountsTimeframeDto;
}

export class VolumeSummaryResponseDto {
  @ApiProperty({
    description: 'Total volume for all time',
  })
  allTime: number;

  @ApiProperty({
    description: 'Total volume for today',
  })
  totalVolumeToday: number;
}

export class SummaryComputedDto {
  @ApiProperty({
    description: 'Volume data',
    type: VolumeSummaryResponseDto,
  })
  volume: VolumeSummaryResponseDto;

  @ApiProperty({
    description: 'Top accounts data',
    type: TopAccountsDto,
  })
  topAccounts: TopAccountsDto;
}

export class GetSummaryResponseDto {
  @ApiProperty({
    description: 'Computed Summary for top accounts and volume',
    type: SummaryComputedDto,
  })
  summary: SummaryComputedDto;
}
