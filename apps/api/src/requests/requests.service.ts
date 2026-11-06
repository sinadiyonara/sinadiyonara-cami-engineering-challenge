import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CustomerRequest, RequestStatus } from './customer-request.entity';

export type RequestListItem = {
  id: string;
  message: string;
  status: RequestStatus;
  category: string | null;
  confidence: number | null;
  noteCount: number;
  latestNotePreview: string | null;
  createdAt: string;
  updatedAt: string;
};

@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(CustomerRequest)
    private readonly requests: Repository<CustomerRequest>,
  ) {}

  async list(): Promise<RequestListItem[]> {
    // LEFT JOIN keeps requests that have no notes. array_agg sorts each request's notes
    // newest first, so [1] is the latest note.
    const rows: (Omit<RequestListItem, 'createdAt' | 'updatedAt'> & {
      createdAt: Date;
      updatedAt: Date;
    })[] = await this.requests.query(`
      SELECT
        r.id,
        r.message,
        r.status,
        r.category,
        r.confidence,
        r.created_at AS "createdAt",
        r.updated_at AS "updatedAt",
        COUNT(n.id)::int AS "noteCount",
        (ARRAY_AGG(n.body ORDER BY n.created_at DESC, n.id DESC))[1] AS "latestNotePreview"
      FROM customer_requests r
      LEFT JOIN request_notes n ON n.request_id = r.id
      GROUP BY r.id
      ORDER BY r.created_at DESC, r.id DESC
    `);

    return rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
    }));
  }

  async getById(id: string): Promise<CustomerRequest> {
    const row = await this.requests.findOne({
      where: { id },
      relations: { notes: true },
    });
    if (!row) {
      throw new NotFoundException(`Request ${id} not found`);
    }
    return row;
  }

  async updateStatus(id: string, status: RequestStatus): Promise<CustomerRequest> {
    const row = await this.getById(id);
    row.status = status;
    return this.requests.save(row);
  }

  async create(message: string): Promise<CustomerRequest> {
    const row = this.requests.create({
      message,
      status: 'open',
      category: null,
      confidence: null,
    });
    return this.requests.save(row);
  }
}
