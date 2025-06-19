import React, { useState, useEffect, useRef } from "react";
import { type EnhancedPlayer } from "../types/playerTypes";
import { pickRandom, extractFeatures, type FeatureCategory } from "../utils/featureUtils";
import { PlayerGrid } from "./PlayerGrid";
import PlayerGuess from "./PlayerGuess";
import playerData from "../data/player_list.json";
import { gameApi, type GameQuestion, type GameAnswer } from '../services/gameService';
import { analytics } from '../services/analytics';

type MultiplayerGameProps = {
  players: EnhancedPlayer[];
  onBackToMenu: () => void;
};

interface GameCell {
  row: number;
  col: number;
  rowFeature: string;
  rowFeatureType: FeatureCategory;
  colFeature: string;
  colFeatureType: FeatureCategory;
  players: EnhancedPlayer[];
  answeredBy?: 1 | 2;
}

interface PlayerScore {
  player1: number;
  player2: number;
}

export function MultiplayerGame({ players, onBackToMenu }: MultiplayerGameProps) {
  const featureCategories: FeatureCategory[] = ["team", "role", "nationality"];

  // Game state
  const [validCells, setValidCells] = useState<GameCell[]>([]);
  const [headerRows, setHeaderRows] = useState<{feature: string, type: FeatureCategory}[]>([]);
  const [headerCols, setHeaderCols] = useState<{feature: string, type: FeatureCategory}[]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [guessResult, setGuessResult] = useState<boolean | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<1 | 2>(1);
  const [scores, setScores] = useState<PlayerScore>({ player1: 0, player2: 0 });
  const [gameOver, setGameOver] = useState(false);
  const [answeredCells, setAnsweredCells] = useState<Array<{
    row: number, 
    col: number, 
    player: 1 | 2,
    correctAnswer: string
  }>>([]);
  
  // Firebase state
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [gameQuestions, setGameQuestions] = useState<(GameQuestion & { id: string })[]>([]);
  const [player1Id] = useState(() => localStorage.getItem('player1Id') || `player1_${Date.now()}`);
  const [player2Id] = useState(() => localStorage.getItem('player2Id') || `player2_${Date.now()}`);

  // Game generation state
  const [isGeneratingGame, setIsGeneratingGame] = useState(false);
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const [gameGenerationError, setGameGenerationError] = useState<string | null>(null);
  
  const gameInitialized = useRef(false);

  // Parse JSON data
  const parsedPlayers = React.useMemo(() => {
    return playerData.map(player => {
      const teamMatches = player.teams.match(/([^|:]+)(?=:)/g) || [];
      const teams = teamMatches.map(team => team.trim());
      
      const roleMatches = player.teams.match(/\([\d-]+, ([^)]+)\)/g) || [];
      const roles = Array.from(new Set(roleMatches.map(role => {
        const match = role.match(/\([\d-]+, ([^)]+)\)/);
        return match ? match[1] : "";
      }).filter(Boolean)));
      
      let nationality = "";
      if (player.nationality.includes("40.png")) nationality = "Almanya";
      else if (player.nationality.includes("174.png")) nationality = "Türkiye";
      else if (player.nationality.includes("157.png")) nationality = "İspanya";
      else if (player.nationality.includes("26.png")) nationality = "Brezilya";
      else if (player.nationality.includes("122.png")) nationality = "Hollanda";
      else if (player.nationality.includes("184.png")) nationality = "ABD";
      else if (player.nationality.includes("50.png")) nationality = "Fransa";
      else if (player.nationality.includes("37.png")) nationality = "Hırvatistan";
      else if (player.nationality.includes("39.png")) nationality = "Danimarka";
      else if (player.nationality.includes("54.png")) nationality = "Gana";
      else if (player.nationality.includes("31.png")) nationality = "Kamerun";
      else nationality = player.nationality.split('/').pop()?.split('.')[0] || "Diğer";

      return {
        name: player.name,
        nationality,
        teamHistory: teams.map(team => ({
          team,
          seasons: roles.map(role => ({ role }))
        }))
      } as EnhancedPlayer;
    });
  }, []);

  const allPlayers = React.useMemo(() => {
    return [...players, ...parsedPlayers];
  }, [players, parsedPlayers]);

  const { teams, roles, nationalities } = extractFeatures(allPlayers);

  // Store player IDs in localStorage
  useEffect(() => {
    localStorage.setItem('player1Id', player1Id);
    localStorage.setItem('player2Id', player2Id);
  }, [player1Id, player2Id]);

  // Game logic functions
  const findPlayersForCriteria = (
    rowFeature: string,
    colFeature: string,
    rowType: FeatureCategory,
    colType: FeatureCategory
  ): EnhancedPlayer[] => {
    return allPlayers.filter(p => {
      if (!p.teamHistory) return false;

      const matchesFeature = (featureType: FeatureCategory, value: string): boolean => {
        if (featureType === "nationality") {
          return p.nationality === value;
        }
        if (featureType === "team") {
          return p.teamHistory?.some(t => t.team === value) || false;
        }
        if (featureType === "role") {
          return p.teamHistory?.some(t =>
            t.seasons.some(s => s.role === value)
          ) || false;
        }
        return false;
      };

      return matchesFeature(rowType, rowFeature) && matchesFeature(colType, colFeature);
    });
  };

  const generateFeaturesForType = (type: FeatureCategory, count: number): string[] => {
    const pool = type === "team" ? teams :
                 type === "role" ? roles :
                 nationalities;
    
    return pickRandom(pool, count);
  };

  // Generate unique features
  const generateUniqueFeatures = (count: number, usedFeatures: Set<string>): {feature: string, type: FeatureCategory}[] => {
    const result: {feature: string, type: FeatureCategory}[] = [];
    
    const maxNationalities = Math.ceil(count / 3);
    let nationalityCount = 0;
    
    const typeCounts = {} as Record<FeatureCategory, number>;
    featureCategories.forEach(cat => {
      typeCounts[cat] = 0;
    });
    
    if (count >= featureCategories.length) {
      featureCategories.forEach(cat => {
        typeCounts[cat] = 1;
        if (cat === "nationality") nationalityCount = 1;
      });
      
      let remaining = count - featureCategories.length;
      
      while (remaining > 0) {
        let typeOptions = [...featureCategories];
        if (nationalityCount >= maxNationalities) {
          typeOptions = typeOptions.filter(t => t !== "nationality");
        }
        
        typeOptions = typeOptions.filter(type => {
          const pool = type === "team" ? teams : 
                      type === "role" ? roles : nationalities;
          return pool.some(feature => !usedFeatures.has(feature));
        });
        
        if (typeOptions.length === 0) break;
        
        const typeToAdd = typeOptions[Math.floor(Math.random() * typeOptions.length)];
        typeCounts[typeToAdd]++;
        if (typeToAdd === "nationality") nationalityCount++;
        remaining--;
      }
    } else {
      for (let i = 0; i < count; i++) {
        const typeIndex = i % featureCategories.length;
        typeCounts[featureCategories[typeIndex]]++;
      }
    }
    
    for (const type of featureCategories) {
      if (typeCounts[type] > 0) {
        const pool = type === "team" ? teams : 
                    type === "role" ? roles : nationalities;
        
        const uniqueFeatures = pickRandom(pool, typeCounts[type], usedFeatures);
        
        uniqueFeatures.forEach(feature => {
          result.push({ feature, type });
          usedFeatures.add(feature);
        });
      }
    }
    
    return result.sort(() => Math.random() - 0.5);
  };

  // Grid generation functions
  const generateValidCellsGrid = (): { 
    cells: GameCell[], 
    rowHeaders: {feature: string, type: FeatureCategory}[],
    colHeaders: {feature: string, type: FeatureCategory}[]
  } => {
    const GRID_SIZE = 3;
    
    let rowHeaders: {feature: string, type: FeatureCategory}[] = [];
    let colHeaders: {feature: string, type: FeatureCategory}[] = [];
    
    const usedFeatures = new Set<string>();
    
    rowHeaders = generateUniqueFeatures(GRID_SIZE, usedFeatures);
    
    const rowHasNationality = rowHeaders.map(header => header.type === "nationality");
    const rowHasRole = rowHeaders.map(header => header.type === "role");
    
    colHeaders = Array(GRID_SIZE).fill(null).map((_, index) => {
      let attempts = 0;
      const maxAttempts = 50;
      
      while (attempts < maxAttempts) {
        let candidateFeature: {feature: string, type: FeatureCategory};
        
        if (rowHasNationality[index]) {
          const nonNationalityType = Math.random() < 0.5 ? "team" : "role";
          const availableFeatures = pickRandom(
            nonNationalityType === "team" ? teams : roles, 
            10,
            usedFeatures
          );
          
          if (availableFeatures.length === 0) {
            attempts++;
            continue;
          }
          
          candidateFeature = { 
            feature: availableFeatures[0], 
            type: nonNationalityType as FeatureCategory 
          };
        } 
        else if (rowHasRole[index]) {
          const nonRoleType = Math.random() < 0.5 ? "team" : "nationality";
          const availableFeatures = pickRandom(
            nonRoleType === "team" ? teams : nationalities, 
            10,
            usedFeatures
          );
          
          if (availableFeatures.length === 0) {
            attempts++;
            continue;
          }
          
          candidateFeature = { 
            feature: availableFeatures[0], 
            type: nonRoleType as FeatureCategory 
          };
        }
        else {
          const availableTypes = featureCategories.filter(type => {
            const pool = type === "team" ? teams : 
                        type === "role" ? roles : nationalities;
            return pool.some(feature => !usedFeatures.has(feature));
          });
          
          if (availableTypes.length === 0) {
            attempts++;
            continue;
          }
          
          const randomType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
          const pool = randomType === "team" ? teams : 
                      randomType === "role" ? roles : nationalities;
          
          const availableFeatures = pickRandom(pool, 10, usedFeatures);
          
          if (availableFeatures.length === 0) {
            attempts++;
            continue;
          }
          
          candidateFeature = { 
            feature: availableFeatures[0], 
            type: randomType 
          };
        }
        
        if (!usedFeatures.has(candidateFeature.feature)) {
          usedFeatures.add(candidateFeature.feature);
          return candidateFeature;
        }
        
        attempts++;
      }
      
      console.warn(`Could not find unique feature for column ${index}, using fallback`);
      return { feature: "Fallback", type: "team" as FeatureCategory };
    });
      
    const validCells: GameCell[] = [];

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const rowHeader = rowHeaders[r];
        const colHeader = colHeaders[c];
        
        if ((rowHeader.type === "nationality" && colHeader.type === "nationality") || 
            (rowHeader.type === "role" && colHeader.type === "role")) {
          console.warn(`Skipping invalid ${rowHeader.type}-${colHeader.type} combination`);
          continue;
        }
        
        const players = findPlayersForCriteria(
          rowHeader.feature,
          colHeader.feature,
          rowHeader.type,
          colHeader.type
        );
        
        if (players.length > 0) {
          validCells.push({
            row: r,
            col: c,
            rowFeature: rowHeader.feature,
            rowFeatureType: rowHeader.type,
            colFeature: colHeader.feature,
            colFeatureType: colHeader.type,
            players
          });
        }
      }
    }
    
    return { cells: validCells, rowHeaders, colHeaders };
  };

  const generateFallbackGrid = (): {
    cells: GameCell[], 
    rowHeaders: {feature: string, type: FeatureCategory}[],
    colHeaders: {feature: string, type: FeatureCategory}[]
  } => {
    const MINIMUM_ANSWERS_PER_QUESTION = 3; // Minimum answers required per question
    
    const uniqueFeatureCombinations = [
      {
        rows: [
          { feature: "Barcelona", type: "team" as FeatureCategory },
          { feature: "Real Madrid", type: "team" as FeatureCategory },
          { feature: "Galatasaray", type: "team" as FeatureCategory }
        ],
        cols: [
          { feature: "Kaleci", type: "role" as FeatureCategory },
          { feature: "Türkiye", type: "nationality" as FeatureCategory },
          { feature: "Defans", type: "role" as FeatureCategory }
        ]
      },
      {
        rows: [
          { feature: "Türkiye", type: "nationality" as FeatureCategory },
          { feature: "Forvet", type: "role" as FeatureCategory },
          { feature: "Bayern Münih", type: "team" as FeatureCategory }
        ],
        cols: [
          { feature: "Barcelona", type: "team" as FeatureCategory },
          { feature: "Brezilya", type: "nationality" as FeatureCategory },
          { feature: "Orta Saha", type: "role" as FeatureCategory }
        ]
      },
      {
        rows: [
          { feature: "Manchester United", type: "team" as FeatureCategory },
          { feature: "İspanya", type: "nationality" as FeatureCategory },
          { feature: "Liverpool", type: "team" as FeatureCategory }
        ],
        cols: [
          { feature: "Forvet", type: "role" as FeatureCategory },
          { feature: "Almanya", type: "nationality" as FeatureCategory },
          { feature: "Kaleci", type: "role" as FeatureCategory }
        ]
      }
    ];
    
    for (let strategyIndex = 0; strategyIndex < uniqueFeatureCombinations.length; strategyIndex++) {
      const combo = uniqueFeatureCombinations[strategyIndex];
      const { rows, cols } = combo;
      
      const allFeatures = [
        ...rows.map(r => r.feature),
        ...cols.map(c => c.feature)
      ];
      const uniqueFeatures = new Set(allFeatures);
      
      if (uniqueFeatures.size !== allFeatures.length) {
        // // console.log(`Multiplayer Strategy ${strategyIndex + 1} has duplicate features, skipping...`);
        continue;
      }
      
      const validCells: GameCell[] = [];
      
      // // console.log(`Trying multiplayer fallback strategy ${strategyIndex + 1} with ${MINIMUM_ANSWERS_PER_QUESTION}+ answers requirement...`);
      
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
          const rowHeader = rows[r];
          const colHeader = cols[c];
          
          if ((rowHeader.type === "nationality" && colHeader.type === "nationality") || 
              (rowHeader.type === "role" && colHeader.type === "role")) {
            // // console.log(`Skipping invalid ${rowHeader.type}-${colHeader.type} combination`);
            continue;
          }
          
          const players = findPlayersForCriteria(
            rowHeader.feature,
            colHeader.feature,
            rowHeader.type,
            colHeader.type
          );
          
          // // console.log(`Multiplayer Cell [${r},${c}] (${rowHeader.feature} × ${colHeader.feature}): ${players.length} players found`);
          
          // Only add cells with at least 10 possible answers
          if (players.length >= MINIMUM_ANSWERS_PER_QUESTION) {
            validCells.push({
              row: r,
              col: c,
              rowFeature: rowHeader.feature,
              rowFeatureType: rowHeader.type,
              colFeature: colHeader.feature,
              colFeatureType: colHeader.type,
              players
            });
          } else {
            // // console.log(`  ❌ Rejected: Only ${players.length} answers (need ${MINIMUM_ANSWERS_PER_QUESTION})`);
          }
        }
      }
      
      if (validCells.length >= 7) { // Still require at least 7 valid cells
        // // console.log(`✅ Using multiplayer fallback combination ${strategyIndex + 1} with ${validCells.length} cells (all ${MINIMUM_ANSWERS_PER_QUESTION}+ answers)`);
        return { cells: validCells, rowHeaders: rows, colHeaders: cols };
      }
    }
    
    // console.log(`❌ Even multiplayer fallback combinations didn't produce enough cells with ${MINIMUM_ANSWERS_PER_QUESTION}+ answers`);
    return {
      cells: [],
      rowHeaders: uniqueFeatureCombinations[0].rows,
      colHeaders: uniqueFeatureCombinations[0].cols
    };
  };

  const generateValidGrid = (): { 
    cells: GameCell[], 
    rowHeaders: {feature: string, type: FeatureCategory}[],
    colHeaders: {feature: string, type: FeatureCategory}[]
  } => {
    let bestGrid = { 
      cells: [] as GameCell[], 
      rowHeaders: [] as {feature: string, type: FeatureCategory}[], 
      colHeaders: [] as {feature: string, type: FeatureCategory}[] 
    };
    let bestCellCount = 0;
    const GRID_SIZE = 3;
    const expectedCellCount = GRID_SIZE * GRID_SIZE;
    const MINIMUM_ANSWERS_PER_QUESTION = 3; // Add this constant
    const maxAttempts = 100;
    
    // console.log(`Attempting to generate a complete ${GRID_SIZE}x${GRID_SIZE} multiplayer grid with at least ${MINIMUM_ANSWERS_PER_QUESTION} answers per question...`);
    
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const grid = generateValidCellsGrid();
      
      // Check if all cells have at least 10 possible answers
      const validCellsWithEnoughAnswers = grid.cells.filter(cell => 
        cell.players.length >= MINIMUM_ANSWERS_PER_QUESTION
      );
      
      // Only consider this grid if ALL cells have enough answers
      if (validCellsWithEnoughAnswers.length === grid.cells.length && 
          grid.cells.length > bestCellCount) {
        bestGrid = grid;
        bestCellCount = grid.cells.length;
        
        // console.log(`Multiplayer Attempt ${attempt + 1}: Found grid with ${bestCellCount}/${expectedCellCount} valid cells (all with ${MINIMUM_ANSWERS_PER_QUESTION}+ answers)`);
        
        // Log answer counts for verification
        grid.cells.forEach((cell, index) => {
          // console.log(`  Multiplayer Cell ${index + 1} (${cell.rowFeature} × ${cell.colFeature}): ${cell.players.length} answers`);
        });
        
        if (bestCellCount === expectedCellCount) {
          // console.log(`✅ Complete multiplayer grid found with all questions having ${MINIMUM_ANSWERS_PER_QUESTION}+ answers on attempt ${attempt + 1}!`);
          break;
        }
      } else if (grid.cells.length > 0) {
        // Log why this grid was rejected
        const insufficientCells = grid.cells.filter(cell => 
          cell.players.length < MINIMUM_ANSWERS_PER_QUESTION
        );
        
        if (insufficientCells.length > 0) {
          // console.log(`Multiplayer Attempt ${attempt + 1}: Rejected grid - ${insufficientCells.length} cells have insufficient answers:`);
          insufficientCells.forEach(cell => {
            // console.log(`  ${cell.rowFeature} × ${cell.colFeature}: only ${cell.players.length} answers (need ${MINIMUM_ANSWERS_PER_QUESTION})`);
          });
        }
      }
      
      if (attempt % 20 === 19) {
        // console.log(`Multiplayer Progress: ${attempt + 1}/${maxAttempts} attempts completed. Best valid grid: ${bestCellCount}/${expectedCellCount} cells`);
      }
    }
    
    if (bestCellCount < expectedCellCount) {
      // console.log(`⚠️ Could not generate complete multiplayer grid with ${MINIMUM_ANSWERS_PER_QUESTION}+ answers per question (best: ${bestCellCount}/${expectedCellCount}). Trying fallback strategies...`);
      
      const fallbackGrid = generateFallbackGrid();
      
      // Check fallback grid for minimum answers too
      const validFallbackCells = fallbackGrid.cells.filter(cell => 
        cell.players.length >= MINIMUM_ANSWERS_PER_QUESTION
      );
      
      if (validFallbackCells.length > bestCellCount) {
        // console.log(`📋 Using multiplayer fallback grid with ${validFallbackCells.length} valid cells (${MINIMUM_ANSWERS_PER_QUESTION}+ answers each)`);
        return {
          ...fallbackGrid,
          cells: validFallbackCells // Only return cells with enough answers
        };
      }
    }
    
    return bestGrid;
  };

  // Initialize multiplayer game with Firebase
  const initializeGame = async () => {
    const maxGenerationAttempts = 10;
    
    if (generationAttempts >= maxGenerationAttempts) {
      setGameGenerationError(
        'Multiplayer oyunu için yeterli oyuncu verisi bulunamadı. Her soru için en az 10 farklı cevap gerekli. ' +
        'Lütfen oyuncu veritabanını genişletin veya daha az kısıtlayıcı kriterler kullanın.'
      );
      setIsGeneratingGame(false);
      return;
    }

    setIsGeneratingGame(true);
    setGenerationAttempts(prev => prev + 1);
    
    const { cells, rowHeaders, colHeaders } = generateValidGrid();
    
    const GRID_SIZE = 3;
    const expectedCellCount = GRID_SIZE * GRID_SIZE;
    const MINIMUM_ANSWERS_PER_QUESTION = 3;
    
    // Check if we have enough valid cells
    if (cells.length < expectedCellCount) {
      // console.log(`❌ Incomplete multiplayer grid generated (${cells.length}/${expectedCellCount} cells). Restarting...`);
      setTimeout(() => {
        initializeGame();
      }, 100);
      return;
    }
    
    // Double-check that all cells have at least 10 answers
    const insufficientCells = cells.filter(cell => cell.players.length < MINIMUM_ANSWERS_PER_QUESTION);
    if (insufficientCells.length > 0) {
      // console.log(`❌ Multiplayer grid has ${insufficientCells.length} cells with insufficient answers. Restarting...`);
      insufficientCells.forEach(cell => {
        // console.log(`  ${cell.rowFeature} × ${cell.colFeature}: ${cell.players.length} answers`);
      });
      setTimeout(() => {
        initializeGame();
      }, 100);
      return;
    }
    
    // console.log(`✅ Complete multiplayer grid generated with ${cells.length} cells, all with ${MINIMUM_ANSWERS_PER_QUESTION}+ answers.`);
    
    // Log answer counts for verification
    cells.forEach((cell, index) => {
      // console.log(`Multiplayer Question ${index + 1} (${cell.rowFeature} × ${cell.colFeature}): ${cell.players.length} possible answers`);
    });
    
    // Prepare questions for multiplayer
    const questions: GameQuestion[] = cells.map((cell, index) => ({
      questionNumber: index + 1,
      rowFeature: cell.rowFeature,
      rowFeatureType: cell.rowFeatureType,
      colFeature: cell.colFeature,
      colFeatureType: cell.colFeatureType,
      correctAnswers: cell.players.map(p => p.name),
      cellPosition: {
        row: cell.row,
        col: cell.col
      }
    }));

    try {
      // Validate questions with backend before creating multiplayer game
      // console.log('🔍 Validating multiplayer questions with backend...');
      const validation = await gameApi.validateQuestions(questions);
      
      if (!validation.isValid) {
        console.warn('❌ Multiplayer backend validation failed. Regenerating game...', validation);
        setTimeout(() => {
          initializeGame();
        }, 100);
        return;
      }
      
      // console.log('✅ Multiplayer backend validation passed:', validation.summary);

      // Create multiplayer game in backend
      const sessionId = `multiplayer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const gameData = await gameApi.createGame(
        player1Id,
        sessionId,
        'multiplayer', // Game mode
        questions,
        player2Id
      );
      
      setCurrentGameId(gameData.game.id);
      setGameQuestions(gameData.questions);
      
      // console.log('🎮 Multiplayer game created with ID:', gameData.game.id);
      // console.log('📊 Multiplayer game validation summary:', gameData.validation || 'No validation data');
    } catch (error) {
      console.error('❌ Failed to create multiplayer game in backend:', error);
      
      // If backend validation fails, regenerate the game
      if (error instanceof Error && error.message.includes('validation')) {
        // console.log('🔄 Regenerating multiplayer game due to validation failure...');
        setTimeout(() => {
          initializeGame();
        }, 100);
        return;
      }
    }

    // If successful, clear loading state
    setIsGeneratingGame(false);
    setGenerationAttempts(0);
    setGameGenerationError(null);

    setValidCells(cells);
    setHeaderRows(rowHeaders);
    setHeaderCols(colHeaders);
    
    setSelectedCell(null);
    setGuessResult(null);
    setCurrentPlayer(1);
    setScores({ player1: 0, player2: 0 });
    setGameOver(false);
    setAnsweredCells([]);
    
    setTimeout(() => {
      logCorrectAnswers(cells);
    }, 500);
  };

  const logCorrectAnswers = (cells: GameCell[]) => {
    // console.log("=== Multiplayer Game - Doğru Cevaplar ===");
    for (const cell of cells) {
      // console.log(`Hücre [${cell.row}][${cell.col}] (${cell.rowFeatureType}: ${cell.rowFeature} - ${cell.colFeatureType}: ${cell.colFeature}):`);
      // console.log(cell.players.map(p => p.name));
    }
  };

  // Game logic
  const getPlayersAtCell = (rowIndex: number, colIndex: number): EnhancedPlayer[] => {
    const cell = validCells.find(c => c.row === rowIndex && c.col === colIndex);
    if (!cell) return [];
    return cell.players;
  };

  const onCellClick = (r: number, c: number) => {
    const isAnswered = answeredCells.some(cell => cell.row === r && cell.col === c);
    if (isAnswered || gameOver) return;

    const hasPlayers = validCells.some(cell => cell.row === r && cell.col === c);
    
    if (hasPlayers) {
      setSelectedCell([r, c]);
      setGuessResult(null);
    }
  };

  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const onGuess = async (guess: string) => {
    if (selectedCell === null || !currentGameId) return;

    const [row, col] = selectedCell;
    const candidates = getPlayersAtCell(row, col);
    const question = gameQuestions.find(q => 
      q.cellPosition.row === row && q.cellPosition.col === col
    );
    
    if (!question) {
      console.error('Question not found for cell:', row, col);
      return;
    }

    const normalizedGuess = normalizeText(guess);
    
    const correct = candidates.some(p => {
      const normalizedName = normalizeText(p.name);
      
      if (normalizedName === normalizedGuess) {
        return true;
      }
      
      if (normalizedName.includes(normalizedGuess) || normalizedGuess.includes(normalizedName)) {
        return (
          normalizedGuess.length >= normalizedName.length * 0.6 || 
          normalizedName.includes(normalizedGuess)
        );
      }
      
      const nameParts = normalizedName.split(" ");
      const guessParts = normalizedGuess.split(" ");
      
      if (nameParts.length >= 2 && guessParts.length >= 1) {
        const firstNameMatch = nameParts[0].startsWith(guessParts[0]) || 
                               (guessParts[0] && guessParts[0].startsWith(nameParts[0]));
                               
        const lastNameMatch = guessParts.length > 1 && 
                             (nameParts[nameParts.length-1].startsWith(guessParts[guessParts.length-1]) ||
                              guessParts[guessParts.length-1].startsWith(nameParts[nameParts.length-1]));
                              
        if (firstNameMatch && lastNameMatch) {
          return true;
        }
        
        if (guessParts.length === 1 && 
            (nameParts[nameParts.length-1].startsWith(guessParts[0]) || 
             guessParts[0].startsWith(nameParts[nameParts.length-1]))) {
          return normalizedGuess.length >= 3;
        }
      }
      
      return false;
    });

    // Find the matched player
    const matchedPlayer = correct ? candidates.find(p => {
      const normalizedName = normalizeText(p.name);
      return normalizedName.includes(normalizedGuess) || normalizedGuess.includes(normalizedName);
    }) : undefined;

    try {
      const currentPlayerId = currentPlayer === 1 ? player1Id : player2Id;
      const turnNumber = answeredCells.length + 1;
      
      // Submit multiplayer answer to backend
      const answerData: GameAnswer = {
        questionId: question.id,
        playerGuess: guess,
        isCorrect: correct,
        matchedPlayerName: matchedPlayer?.name,
        allPossibleAnswers: candidates.map(p => p.name),
        gameMode: 'multiplayer',
        turnNumber
      };

      await gameApi.submitAnswer(currentGameId, answerData);
      
      console.log('💾 Multiplayer answer saved:', {
        player: currentPlayer,
        question: `${question.rowFeature} × ${question.colFeature}`,
        guess,
        correct,
        matchedPlayer: matchedPlayer?.name,
        allPossibleAnswers: candidates.map(p => p.name)
      });
    } catch (error) {
      console.error('Failed to save multiplayer answer:', error);
    }

    setGuessResult(correct);

    if (correct) {
      const newAnsweredCells = [...answeredCells, {
        row,
        col,
        player: currentPlayer,
        correctAnswer: matchedPlayer?.name || guess
      }];

      setAnsweredCells(newAnsweredCells);

      setScores(prev => ({
        ...prev,
        [`player${currentPlayer}`]: prev[`player${currentPlayer}` as keyof PlayerScore] + 1
      }));

      // Check if multiplayer game is complete
      if (newAnsweredCells.length >= validCells.length) {
        const finalPlayer1Score = currentPlayer === 1 ? scores.player1 + 1 : scores.player1;
        const finalPlayer2Score = currentPlayer === 2 ? scores.player2 + 1 : scores.player2;
        
        const winnerId = finalPlayer1Score > finalPlayer2Score ? player1Id :
                        finalPlayer2Score > finalPlayer1Score ? player2Id : null;

        try {
          await gameApi.endGame(currentGameId, winnerId || undefined);
          // console.log('🏁 Multiplayer game completed and saved to backend');
        } catch (error) {
          console.error('Failed to end multiplayer game:', error);
        }

        setTimeout(() => {
          setGameOver(true);
        }, 1500);
        return;
      }

      setTimeout(() => {
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
        setSelectedCell(null);
        setGuessResult(null);
      }, 1500);
    } else {
      setTimeout(() => {
        setCurrentPlayer(currentPlayer === 1 ? 2 : 1);
        setSelectedCell(null);
        setGuessResult(null);
      }, 1500);
    }
  };

  const resetGuess = () => {
    setSelectedCell(null);
    setGuessResult(null);
  };

  const newGame = async () => {
    if (currentGameId) {
      try {
        await gameApi.endGame(currentGameId);
      } catch (error) {
        console.error('Failed to end previous multiplayer game:', error);
      }
    }

    setCurrentGameId(null);
    setGameQuestions([]);
    setAnsweredCells([]);
    setSelectedCell(null);
    setGuessResult(null);
    setCurrentPlayer(1);
    setScores({ player1: 0, player2: 0 });
    setGameOver(false);
    setGameGenerationError(null); // Reset error state
    setGenerationAttempts(0); // Reset attempts
    gameInitialized.current = false;
    initializeGame();
  };

  const getFeatureTypeName = (type: FeatureCategory | null): string => {
    if (!type) return "";
    switch (type) {
      case "team": return "Takım";
      case "role": return "Mevki";
      case "nationality": return "Ülke";
      default: return "";
    }
  };

  const getWinner = (): string => {
    if (scores.player1 > scores.player2) return "Oyuncu 1";
    else if (scores.player2 > scores.player1) return "Oyuncu 2";
    else return "Berabere";
  };

  // Initialize game on component mount
  useEffect(() => {
    if (!gameInitialized.current) {
      initializeGame();
      gameInitialized.current = true;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentGameId) {
        gameApi.endGame(currentGameId).catch(console.error);
      }
    };
  }, [currentGameId]);

  return (
    <div style={{ 
      padding: '20px',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center'
    }}>
      {/* Header */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        marginBottom: '20px',
        width: '100%',
        maxWidth: '800px',
        minHeight: '60px'
      }}>
        <h1 style={{ margin: 0, fontSize: '2rem' }}>İki Oyuncu Modu</h1>
        <button 
          onClick={onBackToMenu}
          style={{
            padding: '8px 16px',
            backgroundColor: '#95a5a6',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '14px'
          }}
        >
          ← Ana Menüye Dön
        </button>
      </div>

      {/* Game ID Display (for debugging) */}
      {currentGameId && (
        <div style={{
          fontSize: '12px',
          color: '#666',
          marginBottom: '10px',
          fontFamily: 'monospace'
        }}>
          Multiplayer Game ID: {currentGameId}
        </div>
      )}

      {/* Loading State */}
      {isGeneratingGame && (
        <div style={{
          padding: '20px',
          backgroundColor: '#e3f2fd',
          borderRadius: '8px',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '10px' }}>
            🎲 Multiplayer Oyunu Oluşturuluyor...
          </div>
          
        </div>
      )}

      {/* Error Display */}
      {gameGenerationError && (
        <div style={{
          padding: '20px',
          backgroundColor: '#ffebee',
          borderRadius: '8px',
          marginBottom: '20px',
          border: '1px solid #f44336'
        }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#d32f2f', marginBottom: '10px' }}>
            ❌ Multiplayer Oyunu Oluşturulamadı
          </div>
          <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px' }}>
            {gameGenerationError}
          </div>
          <button
            onClick={() => {
              setGameGenerationError(null);
              setGenerationAttempts(0);
              initializeGame();
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: '#f44336',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Tekrar Dene
          </button>
        </div>
      )}

      {/* Score Display */}
      {!isGeneratingGame && !gameGenerationError && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: '2rem',
          marginBottom: '20px',
          padding: '15px',
          backgroundColor: '#ecf0f1',
          borderRadius: '8px',
          width: '100%',
          maxWidth: '600px',
          minHeight: '80px'
        }}>
          <div style={{
            padding: '10px 20px',
            backgroundColor: currentPlayer === 1 ? '#3498db' : '#bdc3c7',
            color: 'white',
            borderRadius: '5px',
            fontWeight: 'bold',
            minWidth: '150px',
            textAlign: 'center'
          }}>
            Oyuncu 1: {scores.player1}
          </div>
          <div style={{
            padding: '10px 20px',
            backgroundColor: currentPlayer === 2 ? '#e74c3c' : '#bdc3c7',
            color: 'white',
            borderRadius: '5px',
            fontWeight: 'bold',
            minWidth: '150px',
            textAlign: 'center'
          }}>
            Oyuncu 2: {scores.player2}
          </div>
        </div>
      )}

      {/* Current Player Indicator */}
      {!gameOver && !isGeneratingGame && !gameGenerationError && (
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
          fontSize: '1.2rem',
          fontWeight: 'bold',
          color: currentPlayer === 1 ? '#3498db' : '#e74c3c',
          minHeight: '40px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          Sıra: Oyuncu {currentPlayer}
        </div>
      )}

      {/* Game Over Display */}
      {gameOver && (
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
          padding: '20px',
          backgroundColor: '#2ecc71',
          color: 'white',
          borderRadius: '8px',
          fontSize: '1.5rem',
          fontWeight: 'bold',
          minHeight: '80px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          maxWidth: '600px',
          width: '100%'
        }}>
          Oyun Bitti! Kazanan: {getWinner()}
        </div>
      )}

      {/* New Game Button */}
      <button 
        onClick={newGame} 
        disabled={isGeneratingGame}
        style={{
          padding: '8px 16px',
          backgroundColor: isGeneratingGame ? '#bdc3c7' : '#4caf50',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          marginBottom: '30px',
          cursor: isGeneratingGame ? 'not-allowed' : 'pointer',
          fontSize: '14px',
          minWidth: '150px'
        }}
      >
        {isGeneratingGame ? 'Oluşturuluyor...' : 'Yeni Oyun Başlat'}
      </button>

      {/* Grid Container */}
      {!isGeneratingGame && !gameGenerationError && (
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          width: '100%',
          marginBottom: '30px'
        }}>
          <PlayerGrid
            rowHeaders={headerRows}
            colHeaders={headerCols}
            onCellClick={onCellClick}
            selectedCell={selectedCell || undefined}
            activeCells={validCells.map(c => [c.row, c.col])}
            answeredCells={answeredCells}
            getFeatureTypeName={getFeatureTypeName}
          />
        </div>
      )}

      {/* Player Guess Modal */}
      {selectedCell !== null && !gameOver && !isGeneratingGame && !gameGenerationError && (
        <PlayerGuess
          playersAtCell={getPlayersAtCell(selectedCell[0], selectedCell[1])}
          onGuess={onGuess}
          guessResult={guessResult}
          onReset={resetGuess}
          rowFeature={headerRows[selectedCell[0]]?.feature}
          rowFeatureType={headerRows[selectedCell[0]]?.type}
          colFeature={headerCols[selectedCell[1]]?.feature}
          colFeatureType={headerCols[selectedCell[1]]?.type}
        />
      )}
    </div>
  );
}