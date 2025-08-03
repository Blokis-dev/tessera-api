import { Module } from '@nestjs/common';
import { CertificatesController } from './certificates.controller.new';
import { CertificatesService } from './certificates.service';
import { SupabaseModule } from '../supabase/supabase.module';
import { QrModule } from '../qr/qr.module';
import { IpfsModule } from '../ipfs/ipfs.module';

@Module({
  imports: [
    SupabaseModule,
    QrModule,
    IpfsModule, // Agregamos IpfsModule para usar PinataService
  ],
  controllers: [CertificatesController],
  providers: [CertificatesService],
  exports: [CertificatesService],
})
export class CertificatesModule {}
