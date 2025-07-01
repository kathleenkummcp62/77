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
  status: "online" | "offline" | "processing";
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
  type: "generation" | "upload" | "processing" | "collection";
  status: "pending" | "running" | "completed" | "error";
  progress: number;
  message: string;
  timestamp: Date;
}

export interface SystemConfig {
  threads: number;
  timeout: number;
  proxyConfig: string;
}

export interface VendorURL {
  id: number;
  url: string;
}

export interface CredentialPair {
  id: number;
  login: string;
  password: string;
}

export interface ProxySetting {
  id: number;
  address: string;
  username?: string;
  password?: string;
}

export interface Task {
  id: number;
  vpn_type?: string;
  vendor_url_id?: number;
  url?: string;
  server?: string;
  status?: string;
  progress?: number;
  processed?: number;
  goods?: number;
  bads?: number;
  errors?: number;
  rps?: number;
  created_at?: string;
}

export interface StatsData {
  goods: number;
  bads: number;
  errors: number;
  offline: number;
  ipblock: number;
  processed: number;
  rps: number;
  avg_rps: number;
  peak_rps: number;
  threads: number;
  uptime: number;
  success_rate: number;
}

export interface ServerInfo {
  ip: string;
  status: string;
  uptime: string;
  cpu: number;
  memory: number;
  disk: number;
  speed: string;
  processed: number;
  goods: number;
  bads: number;
  errors: number;
  progress: number;
  current_task: string;
}

export interface ChartDataPoint {
  timestamp: number;
  value: number;
  label?: string;
}

export interface TimeSeriesData {
  name: string;
  data: ChartDataPoint[];
  color?: string;
}

export interface ErrorDistribution {
  type: string;
  count: number;
  percentage: number;
}

export interface VpnTypeStats {
  type: string;
  valid: number;
  invalid: number;
  successRate: number;
}

export interface ServerPerformance {
  ip: string;
  rps: number;
  cpu: number;
  memory: number;
  validFound: number;
}