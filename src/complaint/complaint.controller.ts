import { Controller, Post, UseGuards, Param, Body, Patch } from '@nestjs/common';
import { ComplaintService } from 'src/complaint/complaint.service';
import { AuthGuard } from 'src/auth/auth.guard';

interface CreateComplaintProps {
  reason: string;
  description: string;
  email: string;
}

@Controller('complaints')
export class ComplaintController {
  constructor(private complaintService: ComplaintService) {}

  @UseGuards(AuthGuard)
  @Post('/:memeId')
  createComplaint(@Param() params: { memeId: number }, @Body() { reason, description, email }: CreateComplaintProps) {
    return this.complaintService.create(reason, description, email, params.memeId);
  }

  @UseGuards(AuthGuard)
  @Patch('/:complaintId')
  setReviewed(@Param() params: { complaintId: number }) {
    return this.complaintService.setReviewed(params.complaintId);
  }
}
