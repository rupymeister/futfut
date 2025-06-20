export const TEAM_FILTERS = {
  // Teams to completely exclude from questions
  EXCLUDED_TEAMS: [
    // Youth/Academy teams
    'Youth Team',
    'Reserve Team',
    'B Team',
    'Academy',
    'U21',
    'U19',
    'U18',
    'Celtic',
    'PSV',
    'Frankfurt',
    'Olympiacos',
    'Wolfsburg',
    'Real Betis',
    'Schalke',
    'Feyenoord',
    'Marsilya',
    'Leeds',

    
    // Unknown/Generic teams
    'Unknown',
    'Free Agent',
    'Diğer',
    'Bilinmeyen',
    'Bilinmeyen Takım',
    'Diğer Takımlar',
    
    // Lower division or problematic teams (add teams you don't want)
    'Amateur',
    'Local Club',
    'Training Camp',
    
    // Add specific teams you want to exclude here
    // Example:
    // 'Some Team You Don\'t Want',
    // 'Another Excluded Team'
  ],

  // Teams with low priority (use only if needed for questions)
  LOW_PRIORITY_TEAMS: [
    'Championship Teams',
    'Second Division',
    'League Two',
    'Third Division',
    '2. Lig',
    '3. Lig',
    'TFF 1. Lig',
    'Lower Division Teams'
  ],

  // Preferred teams (prioritize these in questions)
  PREFERRED_TEAMS: [
    // Turkish Super League
    'Galatasaray',
    'Fenerbahçe',
    'Beşiktaş',
    'Trabzonspor',
    'Başakşehir',
    'Konyaspor',
    'Sivasspor',
    
    // European Giants
    'Barcelona',
    'Real Madrid',
    'Manchester United',
    'Manchester City',
    'Liverpool',
    'Chelsea',
    'Arsenal',
    'Tottenham',
    'Bayern Münih',
    'Borussia Dortmund',
    'PSG',
    'Juventus',
    'AC Milan',
    'Inter',
    'Atletico Madrid',
    'Sevilla',
    'Valencia',
    
    // Other Popular Teams
    'Ajax',
    'Porto',
    'Benfica',
    'Rangers',
    'Napoli',
    'Roma',
    'Lazio',
    'Atalanta'
  ],

  // Minimum answer requirements
  QUALITY_SETTINGS: {
    MINIMUM_ANSWERS_REQUIRED: 3,
    PREFERRED_ANSWER_RANGE: { min: 4, max: 7 },
    MAXIMUM_ANSWERS_ALLOWED: 15
  }
};

// Helper function to check if a team should be excluded
export const isTeamExcluded = (teamName: string): boolean => {
  const normalizedTeam = teamName.toLowerCase().trim();
  return TEAM_FILTERS.EXCLUDED_TEAMS.some(excludedTeam => 
    normalizedTeam.includes(excludedTeam.toLowerCase()) ||
    excludedTeam.toLowerCase().includes(normalizedTeam)
  );
};

// Helper function to check if a team is preferred
export const isTeamPreferred = (teamName: string): boolean => {
  const normalizedTeam = teamName.toLowerCase().trim();
  return TEAM_FILTERS.PREFERRED_TEAMS.some(preferredTeam => 
    normalizedTeam === preferredTeam.toLowerCase() ||
    preferredTeam.toLowerCase() === normalizedTeam
  );
};

// Helper function to get team priority score
export const getTeamPriorityScore = (teamName: string): number => {
  if (isTeamExcluded(teamName)) return -1; // Excluded
  if (isTeamPreferred(teamName)) return 3; // High priority
  
  const normalizedTeam = teamName.toLowerCase().trim();
  const isLowPriority = TEAM_FILTERS.LOW_PRIORITY_TEAMS.some(lowTeam => 
    normalizedTeam.includes(lowTeam.toLowerCase()) ||
    lowTeam.toLowerCase().includes(normalizedTeam)
  );
  
  if (isLowPriority) return 1; // Low priority
  return 2; // Normal priority
};