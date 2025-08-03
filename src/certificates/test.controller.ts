import { Controller, Get, Post, Body } from '@nestjs/common';

export interface TestDto {
  message: string;
}

@Controller('test-certificates')
export class TestCertificatesController {
  @Get('health')
  healthCheck() {
    return { status: 'OK', message: 'Test controller working' };
  }

  @Post()
  create(@Body() data: TestDto) {
    return { success: true, data, message: 'POST method working' };
  }
}
