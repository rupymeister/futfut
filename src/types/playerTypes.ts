export interface EnhancedPlayer {
  name: string;
  nationality: string;
  teamHistory?: TeamEntry[];
}

export interface TeamEntry {
  team: string;
  seasons: SeasonEntry[];
}

export interface SeasonEntry {
  year?: string;
  jersey_number?: string;
  role: string;
}

// For raw JSON data
export interface RawPlayerData {
  name: string;
  nationality: string;
  teams: string;
}