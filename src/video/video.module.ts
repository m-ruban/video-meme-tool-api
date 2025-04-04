import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VideoService } from 'src/video/video.service';
import { Meme } from 'src/video/meme.entity';
import { VideoController } from 'src/video/video.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Meme])],
  providers: [VideoService],
  exports: [VideoService],
  controllers: [VideoController],
})
export class VideoModule {}
