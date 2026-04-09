import { Injectable } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';

const execAsync = promisify(exec);

@Injectable()
export class HealthService {
  async getInfrastructureHealth() {
    const dockerInfo = await this.getDockerInfo();
    const systemInfo = this.getSystemUsage();

    return {
      docker: dockerInfo,
      nodes: [
        {
          id: os.hostname(),
          cpuUsage: Math.round(systemInfo.cpuUsage),
          memoryUsage: Math.round(systemInfo.memoryUsage),
          diskUsage: 0, // Manual calculation needed or use df -h
          status: 'healthy',
        }
      ],
      registry: process.env.DOCKER_REGISTRY || 'localhost:5000',
    };
  }

  private async getDockerInfo() {
    try {
      const { stdout: version } = await execAsync("docker version --format \"{{.Server.Version}}\"");
      const { stdout: info } = await execAsync("docker info --format \"{{json .}}\"");
      const dockerData = JSON.parse(info);

      return {
        version: version.trim(),
        status: 'running',
        imageCount: dockerData.Images || 0,
        containerCount: dockerData.Containers || 0,
      };
    } catch (error) {
      return {
        version: 'unknown',
        status: 'down',
        imageCount: 0,
        containerCount: 0,
        error: error.message,
      };
    }
  }

  private getSystemUsage() {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    const memoryUsage = ((totalMem - freeMem) / totalMem) * 100;

    // Simple CPU usage calculation (loadavg for last minute)
    const loadAvg = os.loadavg()[0];
    const cpuCount = os.cpus().length;
    const cpuUsage = (loadAvg / cpuCount) * 100;

    return {
      cpuUsage: Math.min(cpuUsage, 100),
      memoryUsage,
    };
  }
}
