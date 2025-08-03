import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PinataService } from './pinata.service';
import { IpfsService } from './ipfs.service';
import { SupabaseModule } from '../supabase/supabase.module';

@Module({
  imports: [ConfigModule, SupabaseModule],
  providers: [PinataService, IpfsService],
  exports: [PinataService, IpfsService],
})
export class IpfsModule {}
