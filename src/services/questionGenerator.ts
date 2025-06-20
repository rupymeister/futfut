import { TEAM_FILTERS, isTeamExcluded, isTeamPreferred, getTeamPriorityScore } from '../config/teamConfig';

interface Player {
  name: string;
  nationality: string;
  teamHistory?: Array<{
    team: string;
    seasons: Array<{
      role: string;
      season?: string;
    }>;
  }>;
}

interface QuestionCandidate {
  rowFeature: string;
  rowFeatureType: 'team' | 'role' | 'nationality';
  colFeature: string;
  colFeatureType: 'team' | 'role' | 'nationality';
  possibleAnswers: Player[];
  answerCount: number;
  difficulty: 'easy' | 'medium' | 'hard';
  score: number;
  teamPriorityScore?: number;
  questionType?: 'standard' | 'team-combination'; // Add this to distinguish types
}

export class OptimizedQuestionGenerator {
  private players: Player[] = [];
  private precomputedCombinations: QuestionCandidate[] = [];
  private teams: string[] = [];
  private roles: string[] = [];
  private nationalities: string[] = [];
  public isInitialized = false;

  async initialize(players: Player[]) {
    console.log('🔄 Initializing optimized question generator with team filters...');
    const startTime = Date.now();
    
    this.players = players;
    this.extractUniqueFeatures();
    this.precomputeAllCombinations();
    this.sortByQuality();
    
    this.isInitialized = true;
    const endTime = Date.now();
    
    console.log(`✅ Question generator initialized in ${endTime - startTime}ms`);
    console.log(`📊 Generated ${this.precomputedCombinations.length} valid combinations`);
    console.log(`🚫 Excluded ${this.getExcludedTeamsCount()} teams from generation`);
    console.log(`📈 Quality distribution:`, this.getQualityStats());
  }

  private extractUniqueFeatures() {
    const teamSet = new Set<string>();
    const roleSet = new Set<string>();
    const nationalitySet = new Set<string>();

    this.players.forEach(player => {
      nationalitySet.add(player.nationality);
      
      if (player.teamHistory) {
        player.teamHistory.forEach(teamData => {
          // Only add team if it's not excluded using the filter configuration
          if (!isTeamExcluded(teamData.team)) {
            teamSet.add(teamData.team);
          }
          teamData.seasons.forEach(season => {
            roleSet.add(season.role);
          });
        });
      }
    });

    this.teams = Array.from(teamSet);
    this.roles = Array.from(roleSet);
    this.nationalities = Array.from(nationalitySet);

    // Sort teams by priority (preferred teams first)
    this.teams.sort((a, b) => {
      const scoreA = getTeamPriorityScore(a);
      const scoreB = getTeamPriorityScore(b);
      return scoreB - scoreA; // Higher scores first
    });

    console.log(`🔍 Extracted features (after exclusions): ${this.teams.length} teams, ${this.roles.length} roles, ${this.nationalities.length} nationalities`);
    console.log(`⭐ Preferred teams: ${this.teams.filter(team => isTeamPreferred(team)).length}`);
  }

  private precomputeAllCombinations() {
    console.log('🔄 Pre-computing all valid combinations (applying team filters + team×team)...');
    
    // Team × Role combinations (filtered)
    this.teams.forEach(team => {
      this.roles.forEach(role => {
        const answers = this.findPlayersForCriteria(team, role, 'team', 'role');
        if (answers.length >= TEAM_FILTERS.QUALITY_SETTINGS.MINIMUM_ANSWERS_REQUIRED) {
          const candidate = this.createCandidate(team, 'team', role, 'role', answers, 'standard');
          this.precomputedCombinations.push(candidate);
        }
      });
    });

    // Team × Nationality combinations (filtered)
    this.teams.forEach(team => {
      this.nationalities.forEach(nationality => {
        const answers = this.findPlayersForCriteria(team, nationality, 'team', 'nationality');
        if (answers.length >= TEAM_FILTERS.QUALITY_SETTINGS.MINIMUM_ANSWERS_REQUIRED) {
          const candidate = this.createCandidate(team, 'team', nationality, 'nationality', answers, 'standard');
          this.precomputedCombinations.push(candidate);
        }
      });
    });

    // Role × Nationality combinations (no team filtering needed)
    this.roles.forEach(role => {
      this.nationalities.forEach(nationality => {
        const answers = this.findPlayersForCriteria(role, nationality, 'role', 'nationality');
        if (answers.length >= TEAM_FILTERS.QUALITY_SETTINGS.MINIMUM_ANSWERS_REQUIRED) {
          const candidate = this.createCandidate(role, 'role', nationality, 'nationality', answers, 'standard');
          this.precomputedCombinations.push(candidate);
        }
      });
    });

    // NEW: Team × Team combinations (players who played for BOTH teams)
    this.teams.forEach(team1 => {
      this.teams.forEach(team2 => {
        if (team1 !== team2) { // Different teams only
          const answers = this.findPlayersForTeamCombination(team1, team2);
          if (answers.length >= TEAM_FILTERS.QUALITY_SETTINGS.MINIMUM_ANSWERS_REQUIRED) {
            const candidate = this.createCandidate(team1, 'team', team2, 'team', answers, 'team-combination');
            this.precomputedCombinations.push(candidate);
          }
        }
      });
    });

    console.log(`📋 Pre-computed ${this.precomputedCombinations.length} valid combinations`);
    
    // Log breakdown of combination types
    const standardCombinations = this.precomputedCombinations.filter(c => c.questionType === 'standard').length;
    const teamCombinations = this.precomputedCombinations.filter(c => c.questionType === 'team-combination').length;
    console.log(`📊 Combination breakdown: ${standardCombinations} standard, ${teamCombinations} team×team`);
  }

  // NEW: Find players who played for BOTH teams
  private findPlayersForTeamCombination(team1: string, team2: string): Player[] {
    return this.players.filter(player => {
      if (!player.teamHistory) return false;
      
      const playedForTeam1 = player.teamHistory.some(t => t.team === team1 && !isTeamExcluded(t.team));
      const playedForTeam2 = player.teamHistory.some(t => t.team === team2 && !isTeamExcluded(t.team));
      
      return playedForTeam1 && playedForTeam2;
    });
  }

  private findPlayersForCriteria(
    rowFeature: string, 
    colFeature: string, 
    rowType: 'team' | 'role' | 'nationality', 
    colType: 'team' | 'role' | 'nationality'
  ): Player[] {
    return this.players.filter(player => {
      const matchesRow = this.playerMatchesFeature(player, rowFeature, rowType);
      const matchesCol = this.playerMatchesFeature(player, colFeature, colType);
      return matchesRow && matchesCol;
    });
  }

  private playerMatchesFeature(player: Player, feature: string, type: 'team' | 'role' | 'nationality'): boolean {
    switch (type) {
      case 'nationality':
        return player.nationality === feature;
      case 'team':
        // Check if player has this team AND the team is not excluded
        return player.teamHistory?.some(t => 
          t.team === feature && !isTeamExcluded(t.team)
        ) || false;
      case 'role':
        return player.teamHistory?.some(t => 
          t.seasons.some(s => s.role === feature)
        ) || false;
      default:
        return false;
    }
  }

  private createCandidate(
    rowFeature: string, 
    rowType: 'team' | 'role' | 'nationality',
    colFeature: string, 
    colType: 'team' | 'role' | 'nationality',
    answers: Player[],
    questionType: 'standard' | 'team-combination' = 'standard'
  ): QuestionCandidate {
    const answerCount = answers.length;
    const difficulty = this.calculateDifficulty(answerCount, questionType);
    const score = this.calculateScore(answerCount, rowType, colType, rowFeature, colFeature, questionType);

    return {
      rowFeature,
      rowFeatureType: rowType,
      colFeature,
      colFeatureType: colType,
      possibleAnswers: answers,
      answerCount,
      difficulty,
      score,
      teamPriorityScore: this.calculateTeamPriorityScore(rowFeature, rowType, colFeature, colType),
      questionType
    };
  }

  private calculateDifficulty(answerCount: number, questionType: 'standard' | 'team-combination'): 'easy' | 'medium' | 'hard' {
    const { min, max } = TEAM_FILTERS.QUALITY_SETTINGS.PREFERRED_ANSWER_RANGE;
    
    // Team combinations are inherently harder, so adjust thresholds
    if (questionType === 'team-combination') {
      if (answerCount >= 4) return 'easy';
      if (answerCount >= 2) return 'medium';
      return 'hard';
    } else {
      if (answerCount >= max + 2) return 'easy';
      if (answerCount >= min && answerCount <= max) return 'medium';
      return 'hard';
    }
  }

  private calculateScore(
    answerCount: number, 
    rowType: string, 
    colType: string, 
    rowFeature: string, 
    colFeature: string,
    questionType: 'standard' | 'team-combination' = 'standard'
  ): number {
    let score = 0;
    const { min, max } = TEAM_FILTERS.QUALITY_SETTINGS.PREFERRED_ANSWER_RANGE;

    // Optimal answer count bonus
    if (questionType === 'team-combination') {
      // Team combinations are special - even 2-3 answers can be interesting
      if (answerCount >= 2 && answerCount <= 5) {
        score += 120; // Premium for interesting team combinations
      } else if (answerCount >= 1) {
        score += 80; // Still valuable
      }
    } else {
      // Standard scoring for other combinations
      if (answerCount >= min && answerCount <= max) {
        score += 100; // Perfect range
      } else if (answerCount >= TEAM_FILTERS.QUALITY_SETTINGS.MINIMUM_ANSWERS_REQUIRED && answerCount <= max + 3) {
        score += 70; // Good range
      } else {
        score += 30; // Acceptable range
      }
    }

    // Combination type bonus
    if (rowType === 'team' && colType === 'team') {
      score += 50; // Premium for team×team combinations
    } else if (rowType === 'team' && colType === 'role') {
      score += 30; // Most intuitive
    } else if (rowType === 'team' && colType === 'nationality') {
      score += 20;
    } else if (rowType === 'role' && colType === 'nationality') {
      score += 15;
    }

    // Team preference bonus
    if (rowType === 'team' && isTeamPreferred(rowFeature)) score += 25;
    if (colType === 'team' && isTeamPreferred(colFeature)) score += 25;

    // Extra bonus for popular team combinations
    if (questionType === 'team-combination' && 
        isTeamPreferred(rowFeature) && isTeamPreferred(colFeature)) {
      score += 40; // Big rivals or popular combinations
    }

    // Difficulty balance bonus
    if (questionType === 'standard' && answerCount >= min && answerCount <= max) {
      score += 20;
    }

    return score;
  }

  private calculateTeamPriorityScore(
    rowFeature: string, 
    rowType: string, 
    colFeature: string, 
    colType: string
  ): number {
    let teamScore = 0;
    
    if (rowType === 'team') {
      teamScore += getTeamPriorityScore(rowFeature);
    }
    if (colType === 'team') {
      teamScore += getTeamPriorityScore(colFeature);
    }
    
    return teamScore;
  }

  private sortByQuality() {
    this.precomputedCombinations.sort((a, b) => {
      // First sort by team priority, then by quality score
      const teamPriorityDiff = (b.teamPriorityScore || 0) - (a.teamPriorityScore || 0);
      if (teamPriorityDiff !== 0) return teamPriorityDiff;
      
      return b.score - a.score;
    });
  }

  // Generate fresh questions with team filtering
  generateFreshQuestions(
    count: number = 9, 
    difficulty: 'mixed' | 'easy' | 'medium' | 'hard' = 'mixed',
    avoidDuplicates: boolean = true,
    includeTeamCombinations: boolean = true // NEW: Option to include team×team
  ): any[] {
    if (!this.isInitialized) {
      throw new Error('Question generator not initialized. Call initialize() first.');
    }

    console.log(`⚡ Generating ${count} FRESH questions with team filters (${difficulty} difficulty, team×team: ${includeTeamCombinations})`);
    const startTime = Date.now();

    // Filter combinations by type if needed
    let availableCombinations = this.precomputedCombinations;
    if (!includeTeamCombinations) {
      availableCombinations = availableCombinations.filter(c => c.questionType === 'standard');
    }

    // Shuffle the pre-computed combinations to get different questions each time
    const shuffledCombinations = [...availableCombinations]
      .sort(() => Math.random() - 0.5);

    const questions: any[] = [];
    const usedCombinations = new Set<string>();
    const usedFeatures = avoidDuplicates ? new Set<string>() : null;

    // Filter combinations by difficulty
    availableCombinations = this.getFilteredCombinations(difficulty, shuffledCombinations);

    // Prioritize preferred teams in the first few questions
    const preferredCombinations = availableCombinations.filter(c => 
      (c.rowFeatureType === 'team' && isTeamPreferred(c.rowFeature)) ||
      (c.colFeatureType === 'team' && isTeamPreferred(c.colFeature))
    );

    // Also prioritize interesting team combinations
    const teamCombinations = availableCombinations.filter(c => c.questionType === 'team-combination');

    // Smart distribution for mixed difficulty
    const distribution = difficulty === 'mixed' ? this.calculateDistribution(count) : null;

    for (let i = 0; i < count && availableCombinations.length > 0; i++) {
      const targetDifficulty = distribution ? this.getTargetDifficulty(distribution, i) : difficulty;
      
      // For first few questions, try to use preferred teams or interesting team combinations
      let sourcePool = availableCombinations;
      if (i < 3) {
        if (preferredCombinations.length > 0) {
          sourcePool = preferredCombinations;
        } else if (teamCombinations.length > 0) {
          sourcePool = teamCombinations;
        }
      }
      
      const selected = this.selectBestCombination(
        sourcePool, 
        usedCombinations, 
        usedFeatures, 
        targetDifficulty as any
      );

      if (!selected) {
        // Fallback to all combinations if preferred pool is exhausted
        const fallbackSelected = this.selectBestCombination(
          availableCombinations, 
          usedCombinations, 
          usedFeatures, 
          targetDifficulty as any
        );
        if (!fallbackSelected) break;
        
        // Use the fallback selection
        const combinationKey = `${fallbackSelected.rowFeature}_${fallbackSelected.colFeature}`;
        usedCombinations.add(combinationKey);
        
        if (usedFeatures) {
          usedFeatures.add(fallbackSelected.rowFeature);
          usedFeatures.add(fallbackSelected.colFeature);
        }

        questions.push(this.createQuestionObject(fallbackSelected, i));
        continue;
      }

      // Mark as used
      const combinationKey = `${selected.rowFeature}_${selected.colFeature}`;
      usedCombinations.add(combinationKey);
      
      if (usedFeatures) {
        usedFeatures.add(selected.rowFeature);
        usedFeatures.add(selected.colFeature);
      }

      // Generate question
      questions.push(this.createQuestionObject(selected, i));
    }

    const endTime = Date.now();
    console.log(`⚡ Generated ${questions.length} FRESH questions with team filters in ${endTime - startTime}ms`);
    
    // Log team filter statistics
    const teamQuestions = questions.filter(q => q.rowFeatureType === 'team' || q.colFeatureType === 'team');
    const preferredTeamQuestions = teamQuestions.filter(q => 
      (q.rowFeatureType === 'team' && isTeamPreferred(q.rowFeature)) ||
      (q.colFeatureType === 'team' && isTeamPreferred(q.colFeature))
    );
    const teamCombinationQuestions = questions.filter(q => q.questionType === 'team-combination');
    
    console.log(`📊 Question stats: ${preferredTeamQuestions.length}/${teamQuestions.length} use preferred teams, ${teamCombinationQuestions.length} team×team combinations`);
    
    return questions;
  }

  // Helper method to create question object
  private createQuestionObject(candidate: QuestionCandidate, index: number): any {
    return {
      questionNumber: index + 1,
      rowFeature: candidate.rowFeature,
      rowFeatureType: candidate.rowFeatureType,
      colFeature: candidate.colFeature,
      colFeatureType: candidate.colFeatureType,
      correctAnswers: candidate.possibleAnswers.map(p => p.name),
      cellPosition: { row: Math.floor(index / 3), col: index % 3 },
      difficulty: candidate.difficulty,
      answerCount: candidate.answerCount,
      quality: candidate.score,
      teamPriority: candidate.teamPriorityScore,
      questionType: candidate.questionType,
      // Add descriptive text for team combinations
      description: candidate.questionType === 'team-combination' 
        ? `Players who played for both ${candidate.rowFeature} and ${candidate.colFeature}`
        : undefined
    };
  }

  // ... (keep all existing methods: getFilteredCombinations, calculateDistribution, etc.)
  
  private getFilteredCombinations(
    difficulty: 'mixed' | 'easy' | 'medium' | 'hard', 
    combinations?: QuestionCandidate[]
  ): QuestionCandidate[] {
    const source = combinations || this.precomputedCombinations;
    if (difficulty === 'mixed') return source;
    return source.filter(c => c.difficulty === difficulty);
  }

  private calculateDistribution(count: number) {
    return {
      easy: Math.ceil(count * 0.3),
      medium: Math.ceil(count * 0.4),
      hard: Math.floor(count * 0.3)
    };
  }

  private getTargetDifficulty(distribution: any, index: number): 'easy' | 'medium' | 'hard' {
    if (index < distribution.easy) return 'easy';
    if (index < distribution.easy + distribution.medium) return 'medium';
    return 'hard';
  }

  private selectBestCombination(
    available: QuestionCandidate[], 
    usedCombinations: Set<string>, 
    usedFeatures: Set<string> | null,
    targetDifficulty: 'easy' | 'medium' | 'hard' | 'mixed'
  ): QuestionCandidate | null {
    
    // Filter by target difficulty if specified
    let candidates = available;
    if (targetDifficulty !== 'mixed') {
      const difficultyFiltered = available.filter(c => c.difficulty === targetDifficulty);
      if (difficultyFiltered.length > 0) {
        candidates = difficultyFiltered;
      }
    }

    // Find best unused combination
    for (const candidate of candidates) {
      const key = `${candidate.rowFeature}_${candidate.colFeature}`;
      
      if (usedCombinations.has(key)) continue;
      
      if (usedFeatures && 
          (usedFeatures.has(candidate.rowFeature) || usedFeatures.has(candidate.colFeature))) {
        continue;
      }

      return candidate;
    }

    return null;
  }

  // Utility methods
  private getExcludedTeamsCount(): number {
    return TEAM_FILTERS.EXCLUDED_TEAMS.length;
  }

  private getQualityStats() {
    const difficulties = this.precomputedCombinations.reduce((acc, c) => {
      acc[c.difficulty] = (acc[c.difficulty] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const teamCombinationCount = this.precomputedCombinations.filter(c => c.questionType === 'team-combination').length;

    return {
      ...difficulties,
      preferredTeamCombinations: this.precomputedCombinations.filter(c => 
        (c.rowFeatureType === 'team' && isTeamPreferred(c.rowFeature)) ||
        (c.colFeatureType === 'team' && isTeamPreferred(c.colFeature))
      ).length,
      teamCombinations: teamCombinationCount
    };
  }

  // Updated methods to support team combinations
  generateQuestions(
    count: number = 9, 
    difficulty: 'mixed' | 'easy' | 'medium' | 'hard' = 'mixed',
    avoidDuplicates: boolean = true,
    includeTeamCombinations: boolean = true
  ): any[] {
    return this.generateFreshQuestions(count, difficulty, avoidDuplicates, includeTeamCombinations);
  }

  getStats() {
    const standardCombinations = this.precomputedCombinations.filter(c => c.questionType === 'standard').length;
    const teamCombinations = this.precomputedCombinations.filter(c => c.questionType === 'team-combination').length;
    
    return {
      totalCombinations: this.precomputedCombinations.length,
      excludedTeams: this.getExcludedTeamsCount(),
      byDifficulty: {
        easy: this.precomputedCombinations.filter(c => c.difficulty === 'easy').length,
        medium: this.precomputedCombinations.filter(c => c.difficulty === 'medium').length,
        hard: this.precomputedCombinations.filter(c => c.difficulty === 'hard').length
      },
      byType: {
        'team-role': this.precomputedCombinations.filter(c => 
          c.rowFeatureType === 'team' && c.colFeatureType === 'role').length,
        'team-nationality': this.precomputedCombinations.filter(c => 
          c.rowFeatureType === 'team' && c.colFeatureType === 'nationality').length,
        'role-nationality': this.precomputedCombinations.filter(c => 
          c.rowFeatureType === 'role' && c.colFeatureType === 'nationality').length,
        'team-team': teamCombinations
      },
      combinationTypes: {
        standard: standardCombinations,
        teamCombinations: teamCombinations
      },
      averageAnswers: this.precomputedCombinations.reduce((sum, c) => sum + c.answerCount, 0) / this.precomputedCombinations.length,
      preferredTeamCombinations: this.precomputedCombinations.filter(c => 
        (c.rowFeatureType === 'team' && isTeamPreferred(c.rowFeature)) ||
        (c.colFeatureType === 'team' && isTeamPreferred(c.colFeature))
      ).length
    };
  }

  canGenerate(count: number, difficulty: 'mixed' | 'easy' | 'medium' | 'hard' = 'mixed'): boolean {
    const available = this.getFilteredCombinations(difficulty);
    return available.length >= count;
  }
}

// Export singleton instance
export const questionGenerator = new OptimizedQuestionGenerator();