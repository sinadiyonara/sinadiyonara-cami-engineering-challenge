import { DataSource } from 'typeorm';
import { CustomerRequest } from './requests/customer-request.entity';
import { RequestNote } from './requests/request-note.entity';
import { ClassificationRecord } from './requests/classification-record.entity';
import { InitialSchema1710000000000 } from './migrations/1710000000000-InitialSchema';
import { CreateClassifications1710000000002 } from './migrations/1710000000002-CreateClassifications';

export function createDataSource() {
  return new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL ?? 'postgres://cami:cami@localhost:5432/cami',
    entities: [CustomerRequest, RequestNote, ClassificationRecord],
    migrations: [InitialSchema1710000000000, CreateClassifications1710000000002],
    synchronize: false,
    logging: false,
  });
}
