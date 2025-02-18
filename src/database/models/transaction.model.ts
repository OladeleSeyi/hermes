import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'transactions', timestamps: true })
export class Transaction extends Model<Transaction> {
  @Column({ type: DataType.STRING, allowNull: false })
  txHash: string;

  @Column({ type: DataType.STRING, allowNull: false })
  fromAddress: string;

  @Column({ type: DataType.STRING, allowNull: false })
  toAddress: string;

  @Column({ type: DataType.DECIMAL(18, 8), allowNull: false })
  amount: number;

  @Column({ type: DataType.INTEGER, allowNull: false })
  blockNumber: number;
}
