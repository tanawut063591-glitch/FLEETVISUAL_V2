export interface VesselSettingsRecord {
  id: string;
  name: string;
  prefix: string;
  image: string;
  description: string;
  nationality: string;
  customer: string;
  owner: string;
  agency: string;
  groups: string[];
  engines: string[];
  status: 'online' | 'offline' | 'unknown';
  latitude?: number;
  longitude?: number;
  source: 'backend' | 'local';
  raw?: unknown;
}
