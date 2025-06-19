import { type EnhancedPlayer } from "../types/playerTypes";

export type FeatureCategory = "team" | "role" | "nationality";

export interface ExtractedFeatures {
  teams: string[];
  roles: string[];
  nationalities: string[];
}

export interface UsedFeatures {
  teams: Set<string>;
  roles: Set<string>;
  nationalities: Set<string>;
}

// Randomly pick n items from an array, excluding used items
export function pickRandom<T>(array: T[], n: number, used: Set<T> = new Set()): T[] {
  const available = array.filter(item => !used.has(item));
  
  if (available.length === 0) {
    console.warn("No available items to pick from after filtering used items");
    return [];
  }
  
  if (available.length < n) {
    console.warn(`Requested ${n} items but only ${available.length} available after filtering`);
  }
  
  const shuffled = [...available].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, Math.min(n, available.length));
}

// Extract all unique features from an array of players
export function extractFeatures(players: EnhancedPlayer[]): ExtractedFeatures {
  const teams = new Set<string>();
  const roles = new Set<string>();
  const nationalities = new Set<string>();

  players.forEach(player => {
    // Add nationality
    if (player.nationality) {
      nationalities.add(player.nationality);
    }

    // Add teams and roles
    if (player.teamHistory) {
      player.teamHistory.forEach(teamEntry => {
        teams.add(teamEntry.team);
        
        teamEntry.seasons.forEach(season => {
          if (season.role) {
            roles.add(season.role);
          }
        });
      });
    }
  });

  return {
    teams: Array.from(teams),
    roles: Array.from(roles),
    nationalities: Array.from(nationalities)
  };
}

// Get available features excluding used ones
export function getAvailableFeatures(
  allFeatures: ExtractedFeatures,
  usedFeatures: UsedFeatures
): ExtractedFeatures {
  return {
    teams: allFeatures.teams.filter(team => !usedFeatures.teams.has(team)),
    roles: allFeatures.roles.filter(role => !usedFeatures.roles.has(role)),
    nationalities: allFeatures.nationalities.filter(nat => !usedFeatures.nationalities.has(nat))
  };
}