import { TEAM_FILTERS, isTeamExcluded, isTeamPreferred, getTeamPriorityScore } from '../config/teamConfig';

// filepath: /Users/anilaltuncu/Documents/ficfucfoe/futbolcu-oyunu/src/services/questionGenerator.ts

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
    questionType?: 'standard' | 'team-combination';
}

interface GridQuestion {
    rowHeaders: string[];
    rowHeaderTypes: ('team' | 'role' | 'nationality')[];
    colHeaders: string[];
    colHeaderTypes: ('team' | 'role' | 'nationality')[];
    questions: QuestionCandidate[];
    grid: Array<Array<{
        correctAnswers: string[];
        answerCount: number;
        difficulty: 'easy' | 'medium' | 'hard';
    }>>;
}

export class OptimizedQuestionGenerator {
    private players: Player[] = [];
    private precomputedCombinations: QuestionCandidate[] = [];
    private teams: string[] = [];
    private roles: string[] = [];
    private nationalities: string[] = [];
    private combinationLookup: Map<string, QuestionCandidate> = new Map();
    public isInitialized = false;

    async initialize(players: Player[]) {
        console.log('🔄 Initializing optimized question generator...');
        const startTime = Date.now();
        
        this.players = players;
        this.extractUniqueFeatures();
        this.precomputeAllCombinations();
        this.buildLookupMap();
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
            return scoreB - scoreA;
        });

        console.log(`🔍 Extracted features: ${this.teams.length} teams, ${this.roles.length} roles, ${this.nationalities.length} nationalities`);
        console.log(`⭐ Preferred teams: ${this.teams.filter(team => isTeamPreferred(team)).length}`);
    }

    private precomputeAllCombinations() {
        console.log('🔄 Pre-computing all valid combinations...');
        
        // Team × Role combinations
        this.teams.forEach(team => {
            this.roles.forEach(role => {
                const answers = this.findPlayersForCriteria(team, role, 'team', 'role');
                if (answers.length >= TEAM_FILTERS.QUALITY_SETTINGS.MINIMUM_ANSWERS_REQUIRED) {
                    const candidate = this.createCandidate(team, 'team', role, 'role', answers, 'standard');
                    this.precomputedCombinations.push(candidate);
                }
            });
        });

        // Team × Nationality combinations
        this.teams.forEach(team => {
            this.nationalities.forEach(nationality => {
                const answers = this.findPlayersForCriteria(team, nationality, 'team', 'nationality');
                if (answers.length >= TEAM_FILTERS.QUALITY_SETTINGS.MINIMUM_ANSWERS_REQUIRED) {
                    const candidate = this.createCandidate(team, 'team', nationality, 'nationality', answers, 'standard');
                    this.precomputedCombinations.push(candidate);
                }
            });
        });

        // Role × Nationality combinations
        this.roles.forEach(role => {
            this.nationalities.forEach(nationality => {
                const answers = this.findPlayersForCriteria(role, nationality, 'role', 'nationality');
                if (answers.length >= TEAM_FILTERS.QUALITY_SETTINGS.MINIMUM_ANSWERS_REQUIRED) {
                    const candidate = this.createCandidate(role, 'role', nationality, 'nationality', answers, 'standard');
                    this.precomputedCombinations.push(candidate);
                }
            });
        });

        console.log(`📋 Pre-computed ${this.precomputedCombinations.length} valid combinations`);
    }

    private buildLookupMap() {
        this.combinationLookup.clear();
        this.precomputedCombinations.forEach(combination => {
            const key = `${combination.rowFeature}|${combination.rowFeatureType}|${combination.colFeature}|${combination.colFeatureType}`;
            this.combinationLookup.set(key, combination);
        });
    }

    // NEW: Generate optimized 3x3 grid with proper headers
    generateOptimized3x3Grid(): GridQuestion {
        if (!this.isInitialized) {
            throw new Error('Question generator not initialized. Call initialize() first.');
        }

        console.log('🎯 Generating optimized 3x3 grid...');
        const maxAttempts = 50;
        
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const { rowHeaders, colHeaders } = this.selectOptimalHeaders();
            const gridResult = this.validateAndBuildGrid(rowHeaders, colHeaders);
            
            if (gridResult.isValid && gridResult.validCells >= 8) { // Allow 8/9 valid cells
                console.log(`✅ Generated valid 3x3 grid on attempt ${attempt + 1} with ${gridResult.validCells}/9 valid cells`);
                return gridResult.gridQuestion!;
            }
        }

        // Fallback to best effort grid
        console.log('⚠️ Using fallback grid generation...');
        return this.generateFallbackGrid();
    }

    private selectOptimalHeaders(): {
        rowHeaders: Array<{feature: string, type: 'team' | 'role' | 'nationality'}>,
        colHeaders: Array<{feature: string, type: 'team' | 'role' | 'nationality'}>
    } {
        // Strategy: Mix preferred teams with roles and nationalities for variety
        const preferredTeams = this.teams.filter(team => isTeamPreferred(team)).slice(0, 6);
        const shuffledTeams = [...this.teams].sort(() => Math.random() - 0.5);
        const shuffledRoles = [...this.roles].sort(() => Math.random() - 0.5);
        const shuffledNationalities = [...this.nationalities].sort(() => Math.random() - 0.5);

        // Generate different combinations
        const combinations = [
            // 2 teams + 1 role vs 2 teams + 1 nationality
            {
                rows: [
                    { feature: preferredTeams[0] || shuffledTeams[0], type: 'team' as const },
                    { feature: preferredTeams[1] || shuffledTeams[1], type: 'team' as const },
                    { feature: shuffledRoles[0], type: 'role' as const }
                ],
                cols: [
                    { feature: preferredTeams[2] || shuffledTeams[2], type: 'team' as const },
                    { feature: preferredTeams[3] || shuffledTeams[3], type: 'team' as const },
                    { feature: shuffledNationalities[0], type: 'nationality' as const }
                ]
            },
            // 3 teams vs 2 roles + 1 nationality
            {
                rows: [
                    { feature: shuffledTeams[0], type: 'team' as const },
                    { feature: shuffledTeams[1], type: 'team' as const },
                    { feature: shuffledTeams[2], type: 'team' as const }
                ],
                cols: [
                    { feature: shuffledRoles[0], type: 'role' as const },
                    { feature: shuffledRoles[1], type: 'role' as const },
                    { feature: shuffledNationalities[0], type: 'nationality' as const }
                ]
            }
        ];

        // Select random combination
        const selected = combinations[Math.floor(Math.random() * combinations.length)];
        return { rowHeaders: selected.rows, colHeaders: selected.cols };
    }

    private validateAndBuildGrid(
        rowHeaders: Array<{feature: string, type: 'team' | 'role' | 'nationality'}>,
        colHeaders: Array<{feature: string, type: 'team' | 'role' | 'nationality'}>
    ): {
        isValid: boolean;
        validCells: number;
        gridQuestion?: GridQuestion;
    } {
        const grid: Array<Array<{
            correctAnswers: string[];
            answerCount: number;
            difficulty: 'easy' | 'medium' | 'hard';
        }>> = [];
        
        const questions: QuestionCandidate[] = [];
        let validCells = 0;

        for (let row = 0; row < 3; row++) {
            const gridRow = [];
            
            for (let col = 0; col < 3; col++) {
                const rowHeader = rowHeaders[row];
                const colHeader = colHeaders[col];

                // Skip invalid combinations
                if ((rowHeader.type === 'nationality' && colHeader.type === 'nationality') ||
                        (rowHeader.type === 'role' && colHeader.type === 'role')) {
                    gridRow.push({
                        correctAnswers: [],
                        answerCount: 0,
                        difficulty: 'hard' as const
                    });
                    continue;
                }

                // Fast lookup using precomputed combinations
                const key = `${rowHeader.feature}|${rowHeader.type}|${colHeader.feature}|${colHeader.type}`;
                const combination = this.combinationLookup.get(key);

                if (combination && combination.answerCount >= 3) {
                    validCells++;
                    gridRow.push({
                        correctAnswers: combination.possibleAnswers.map(p => p.name),
                        answerCount: combination.answerCount,
                        difficulty: combination.difficulty
                    });
                    questions.push(combination);
                } else {
                    gridRow.push({
                        correctAnswers: [],
                        answerCount: 0,
                        difficulty: 'hard' as const
                    });
                }
            }
            
            grid.push(gridRow);
        }

        const gridQuestion: GridQuestion = {
            rowHeaders: rowHeaders.map(h => h.feature),
            rowHeaderTypes: rowHeaders.map(h => h.type),
            colHeaders: colHeaders.map(h => h.feature),
            colHeaderTypes: colHeaders.map(h => h.type),
            questions,
            grid
        };

        return {
            isValid: validCells >= 7, // Require at least 7 valid cells
            validCells,
            gridQuestion: validCells >= 7 ? gridQuestion : undefined
        };
    }

    private generateFallbackGrid(): GridQuestion {
        // Use most reliable combinations for fallback
        const preferredTeams = this.teams.filter(team => isTeamPreferred(team)).slice(0, 4);
        const topRoles = this.roles.slice(0, 2);
        const topNationalities = this.nationalities.slice(0, 2);

        const rowHeaders = [
            { feature: preferredTeams[0] || this.teams[0], type: 'team' as const },
            { feature: preferredTeams[1] || this.teams[1], type: 'team' as const },
            { feature: topRoles[0], type: 'role' as const }
        ];

        const colHeaders = [
            { feature: preferredTeams[2] || this.teams[2], type: 'team' as const },
            { feature: topRoles[1] || this.roles[1], type: 'role' as const },
            { feature: topNationalities[0], type: 'nationality' as const }
        ];

        const result = this.validateAndBuildGrid(rowHeaders, colHeaders);
        return result.gridQuestion || this.createEmptyGrid(rowHeaders, colHeaders);
    }

    private createEmptyGrid(
        rowHeaders: Array<{feature: string, type: 'team' | 'role' | 'nationality'}>,
        colHeaders: Array<{feature: string, type: 'team' | 'role' | 'nationality'}>
    ): GridQuestion {
        const emptyGrid = Array(3).fill(null).map(() => 
            Array(3).fill(null).map(() => ({
                correctAnswers: [],
                answerCount: 0,
                difficulty: 'hard' as const
            }))
        );

        return {
            rowHeaders: rowHeaders.map(h => h.feature),
            rowHeaderTypes: rowHeaders.map(h => h.type),
            colHeaders: colHeaders.map(h => h.feature),
            colHeaderTypes: colHeaders.map(h => h.type),
            questions: [],
            grid: emptyGrid
        };
    }

    // Keep existing methods for backward compatibility
    generateFreshQuestions(
        count: number = 9, 
        difficulty: 'mixed' | 'easy' | 'medium' | 'hard' = 'mixed',
        avoidDuplicates: boolean = true,
        includeTeamCombinations: boolean = false
    ): any[] {
        const gridQuestion = this.generateOptimized3x3Grid();
        
        // Convert grid to question format
        const questions: any[] = [];
        let questionNumber = 1;

        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 3; col++) {
                const cell = gridQuestion.grid[row][col];
                if (cell.answerCount > 0) {
                    questions.push({
                        questionNumber: questionNumber++,
                        rowFeature: gridQuestion.rowHeaders[row],
                        rowFeatureType: gridQuestion.rowHeaderTypes[row],
                        colFeature: gridQuestion.colHeaders[col],
                        colFeatureType: gridQuestion.colHeaderTypes[col],
                        correctAnswers: cell.correctAnswers,
                        cellPosition: { row, col },
                        difficulty: cell.difficulty,
                        answerCount: cell.answerCount,
                        quality: 100,
                        teamPriority: 0,
                        questionType: 'standard'
                    });
                }
            }
        }

        return questions.slice(0, count);
    }

    // Existing helper methods remain the same...
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

        if (answerCount >= min && answerCount <= max) {
            score += 100;
        } else if (answerCount >= TEAM_FILTERS.QUALITY_SETTINGS.MINIMUM_ANSWERS_REQUIRED) {
            score += 70;
        } else {
            score += 30;
        }

        // Combination type bonus
        if (rowType === 'team' && colType === 'role') score += 30;
        else if (rowType === 'team' && colType === 'nationality') score += 20;
        else if (rowType === 'role' && colType === 'nationality') score += 15;

        // Team preference bonus
        if (rowType === 'team' && isTeamPreferred(rowFeature)) score += 25;
        if (colType === 'team' && isTeamPreferred(colFeature)) score += 25;

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
            const teamPriorityDiff = (b.teamPriorityScore || 0) - (a.teamPriorityScore || 0);
            if (teamPriorityDiff !== 0) return teamPriorityDiff;
            return b.score - a.score;
        });
    }

    private getExcludedTeamsCount(): number {
        return TEAM_FILTERS.EXCLUDED_TEAMS.length;
    }

    private getQualityStats() {
        const difficulties = this.precomputedCombinations.reduce((acc, c) => {
            acc[c.difficulty] = (acc[c.difficulty] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);

        return {
            ...difficulties,
            total: this.precomputedCombinations.length
        };
    }

    // Public API methods
    generateQuestions(
        count: number = 9, 
        difficulty: 'mixed' | 'easy' | 'medium' | 'hard' = 'mixed',
        avoidDuplicates: boolean = true,
        includeTeamCombinations: boolean = false
    ): any[] {
        return this.generateFreshQuestions(count, difficulty, avoidDuplicates, includeTeamCombinations);
    }

    getStats() {
        return {
            totalCombinations: this.precomputedCombinations.length,
            excludedTeams: this.getExcludedTeamsCount(),
            byDifficulty: this.getQualityStats(),
            averageAnswers: this.precomputedCombinations.reduce((sum, c) => sum + c.answerCount, 0) / this.precomputedCombinations.length
        };
    }

    canGenerate(count: number, difficulty: 'mixed' | 'easy' | 'medium' | 'hard' = 'mixed'): boolean {
        return this.precomputedCombinations.length >= count;
    }
}

// Export singleton instance
export const questionGenerator = new OptimizedQuestionGenerator();