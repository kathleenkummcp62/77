export interface ServerCredential {
  ip: string;
  username: string;
  password: string;
}

export interface ServerStats {
  ip: string;
  goods: number;
  bads: number;
  errors: number;
  offline: number;
  ipblock: number;
  processed: number;
  speed: number;
  uptime: number;
  status: 'online' | 'offline' | 'processing';
}

export interface VPNType {
  id: string;
  name: string;
  script: string;
  color: string;
  icon: string;
}

export interface TaskStatus {
  id: string;
  type: 'generation' | 'upload' | 'processing' | 'collection';
  status: 'pending' | 'running' | 'completed' | 'error';
  progress: number;
  message: string;
  timestamp: Date;
}

export interface SystemConfig {
  threads: number;
  timeout: number;
  proxyConfig: string;
}
