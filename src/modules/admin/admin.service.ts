import { Injectable } from '@nestjs/common';

@Injectable()
export class AdminService {
  async listJobs() { return { jobs: [] }; }

  async killJob(jobId: string) {
    return { message: 'Job ' + jobId + ' da bi dung. Bai nop: FAILED' };
  }

  async getSandboxConfig() {
    return { languages: [
      { lang: 'python', cpu: '0.5vCPU', ram: '128MB', timeout: 10, enabled: true },
      { lang: 'java', cpu: '1vCPU', ram: '256MB', timeout: 15, enabled: true },
      { lang: 'cpp', cpu: '0.5vCPU', ram: '128MB', timeout: 10, enabled: true },
    ]};
  }

  async updateSandboxConfig(dto: any) {
    return { message: 'Da cap nhat cau hinh ' + dto.language, appliedAt: new Date().toISOString() };
  }

  async getAuditLogs(query: any) { return { logs: [], total: 0 }; }
  async getAuditLog(id: number) { return { id }; }
  async listLanguages() { return { languages: [] }; }

  async addLanguage(dto: any) {
    return { id: Math.floor(Math.random() * 100), message: 'Da them ngon ngu thanh cong' };
  }

  async updateLanguage(id: number, dto: any) {
    return { message: 'Da cap nhat ngon ngu', updatedAt: new Date().toISOString() };
  }
}
