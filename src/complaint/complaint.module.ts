import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ComplaintService } from 'src/complaint/complaint.service';
import { Complaint } from 'src/complaint/complaint.entity';
import { ComplaintController } from 'src/complaint/complaint.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Complaint])],
  providers: [ComplaintService],
  exports: [ComplaintService],
  controllers: [ComplaintController],
})
export class ComplaintModule {}
