export interface EntityConfig {
  id: string;
  ingress: Record<string, { id: string }>;
  egress: Record<string, { id: string }>;
}

export interface PositionalObject {
  id: string;
  position: Position;
}

export interface Position {
  latitude: number;
  longitude: number;
  accuracy: number;
  altitude: number;
  timestamp: string;
}
