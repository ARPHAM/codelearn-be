import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuditLog } from '../../modules/admin/entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepo: Repository<AuditLog>,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, user, body, ip } = request;

    // Chỉ log các thay đổi dữ liệu
    const writeMethods = ['POST', 'PATCH', 'PUT', 'DELETE'];
    if (!writeMethods.includes(method)) {
      return next.handle();
    }

    return next.handle().pipe(
      tap(async () => {
        try {
          const audit = this.auditRepo.create({
            userId: user?.id,
            action: `${method} ${url}`,
            metadata: {
              ip,
              body: method !== 'DELETE' ? body : undefined,
              userAgent: request.headers['user-agent'],
            },
          });
          await this.auditRepo.save(audit);
        } catch (error) {
          console.error('Audit Log Error:', error);
        }
      }),
    );
  }
}
