import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ClassificationService } from './classification.service';
import { CustomerRequest } from './customer-request.entity';
import { RequestNote } from './request-note.entity';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { KeywordClassifier } from './keyword-classifier';

@Module({
  imports: [TypeOrmModule.forFeature([CustomerRequest, RequestNote])],
  controllers: [RequestsController],
  providers: [RequestsService, ClassificationService, KeywordClassifier],
})
export class RequestsModule {}
