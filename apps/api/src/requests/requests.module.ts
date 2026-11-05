import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassificationRecord } from './classification-record.entity';
import { ClassificationService } from './classification.service';
import { CLASSIFIER_PROVIDER } from './classifier-provider';
import { CustomerRequest } from './customer-request.entity';
import { RequestNote } from './request-note.entity';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { KeywordClassifier } from './keyword-classifier';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerRequest, RequestNote, ClassificationRecord])],
  controllers: [RequestsController],
  providers: [
    RequestsService,
    ClassificationService,
    { provide: CLASSIFIER_PROVIDER, useClass: KeywordClassifier },
  ],
})
export class RequestsModule {}
