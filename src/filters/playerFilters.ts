import type { EnhancedPlayer, TeamEntry, SeasonEntry } from "../types/playerTypes";

interface FilterCriteria {
  nationality?: string;
  multi_team_min?: number;
  team1?: string;
  team2?: string;
  team?: string;
  role?: string;
  jersey_number?: string; // Changed from number to string to match your data model
  decade?: number;
  played_years?: string[];
}

export function findSpecialPlayers(playerList: EnhancedPlayer[], criteria: FilterCriteria): EnhancedPlayer[] {
  const specialPlayers: EnhancedPlayer[] = [];
  
  for (const player of playerList) {
    // Skip players without necessary data
    if (!player.teamHistory) continue;
    
    // Filter by nationality
    if (criteria.nationality && !player.nationality.includes(criteria.nationality)) continue;
    
    // Filter by minimum number of teams played for
    if (criteria.multi_team_min && player.teamHistory.length < criteria.multi_team_min) continue;

    // Find players who played for both team1 and team2
    if (criteria.team1 && criteria.team2) {
      const team1Found = player.teamHistory.some((teamInfo) => teamInfo.team === criteria.team1);
      const team2Found = player.teamHistory.some((teamInfo) => teamInfo.team === criteria.team2);
      if (team1Found && team2Found) {
        specialPlayers.push(player);
        continue;
      }
    } 
    // Find players who played a specific role for a specific team
    else if (criteria.team && criteria.role) {
      if (player.teamHistory.some((teamInfo) =>
        teamInfo.team === criteria.team &&
        teamInfo.seasons.some((season) => 
          season.role?.toLowerCase().includes(criteria.role!.toLowerCase())
        )
      )) {
        specialPlayers.push(player);
        continue;
      }
    } 
    // Find players who wore a specific jersey number for a specific team
    else if (criteria.team && criteria.jersey_number) {
      if (player.teamHistory.some((teamInfo) =>
        teamInfo.team === criteria.team &&
        teamInfo.seasons.some((season) => 
          season.jersey_number === criteria.jersey_number
        )
      )) {
        specialPlayers.push(player);
        continue;
      }
    } 
    // Find players who played in a specific decade
    else if (criteria.decade) {
      const decadeYears = Array.from({length: 10}, (_, i) => String(criteria.decade! + i));
      if (player.teamHistory.some((teamInfo) =>
        teamInfo.seasons.some((season) => 
          season.year && decadeYears.includes(season.year)
        )
      )) {
        specialPlayers.push(player);
        continue;
      }
    } 
    // Find players who played in specific years
    else if (criteria.played_years) {
      if (player.teamHistory.some((teamInfo) =>
        teamInfo.seasons.some((season) => 
          season.year && criteria.played_years!.includes(season.year)
        )
      )) {
        specialPlayers.push(player);
        continue;
      }
    } 
    // Find players who played for a specific team
    else if (criteria.team) {
      if (player.teamHistory.some((teamInfo) => teamInfo.team === criteria.team)) {
        specialPlayers.push(player);
        continue;
      }
    }
  }

  // Remove duplicates by name
  const uniquePlayers: EnhancedPlayer[] = [];
  const seenNames = new Set<string>();
  for (const player of specialPlayers) {
    if (!seenNames.has(player.name)) {
      uniquePlayers.push(player);
      seenNames.add(player.name);
    }
  }

  return uniquePlayers;
}