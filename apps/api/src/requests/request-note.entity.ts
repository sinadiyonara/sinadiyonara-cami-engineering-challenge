import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { CustomerRequest } from './customer-request.entity';

@Entity({ name: 'request_notes' })
export class RequestNote {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'text' })
  body!: string;

  @Column({ name: 'author_name', type: 'varchar', length: 120 })
  authorName!: string;

  @ManyToOne(() => CustomerRequest, (request) => request.notes, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'request_id' })
  request!: CustomerRequest;

  @Column({ name: 'request_id', type: 'uuid' })
  requestId!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
