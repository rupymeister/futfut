import React, { useState, useEffect, useRef } from "react";
import { type EnhancedPlayer } from "../types/playerTypes";
import { pickRandom, extractFeatures, type FeatureCategory } from "../utils/featureUtils";
import { PlayerGrid } from "./PlayerGrid";
import PlayerGuess from "./PlayerGuess";
import { analytics } from "../services/analytics";
import { gameApi, type GameQuestion, type GameAnswer } from '../services/gameService';
import playerData from "../data/player_list_with_generalized_roles.json";
import { questionGenerator } from "../services/questionGenerator";

type GameProps = {
  players: EnhancedPlayer[];
  onBackToMenu: () => void;
};

// Define a cell structure for individual questions
interface GameCell {
  row: number;
  col: number;
  rowFeature: string;
  rowFeatureType: FeatureCategory;
  colFeature: string;
  colFeatureType: FeatureCategory;
  players: EnhancedPlayer[];
}

export function Game({ players, onBackToMenu }: GameProps) {
  const featureCategories: FeatureCategory[] = ["team", "role", "nationality"];

  // Track valid cells (those with answers)
  const [validCells, setValidCells] = useState<GameCell[]>([]);
  const [headerRows, setHeaderRows] = useState<{feature: string, type: FeatureCategory}[]>([]);
  const [headerCols, setHeaderCols] = useState<{feature: string, type: FeatureCategory}[]>([]);
  const [selectedCell, setSelectedCell] = useState<[number, number] | null>(null);
  const [guessResult, setGuessResult] = useState<boolean | null>(null);
  const [answeredCells, setAnsweredCells] = useState<Array<{
    row: number, 
    col: number, 
    player: 1 | 2,
    correctAnswer: string
  }>>([]);
  
  // Firebase state
  const [currentGameId, setCurrentGameId] = useState<string | null>(null);
  const [gameQuestions, setGameQuestions] = useState<(GameQuestion & { id: string })[]>([]);
  
  // Game generation state
  const [isGeneratingGame, setIsGeneratingGame] = useState(false);
  const [generationAttempts, setGenerationAttempts] = useState(0);
  const [gameGenerationError, setGameGenerationError] = useState<string | null>(null);
  
  // Track if the game has been initialized to prevent refreshing on re-renders
  const gameInitialized = useRef(false);

  // Parse the imported JSON data
  const parsedPlayers = React.useMemo(() => {
    return playerData.map(player => {
      // Extract team names from the teams string
      const teamMatches = player.teams.match(/([^|:]+)(?=:)/g) || [];
      const teams = teamMatches.map(team => team.trim());
      
      // Extract roles from the teams string
      const roleMatches = player.teams.match(/\([\d-]+, ([^)]+)\)/g) || [];
      const roles = player.generalized_roles;
      
      // Determine nationality based on image URL
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
          seasons: Array.isArray(roles) ? roles.map((role: string) => ({ role })) : [{ role: roles }]
        }))
      } as EnhancedPlayer;
    });
  }, []);

  // Set up player ID once (no game_start tracking)
  useEffect(() => {
    const playerId = localStorage.getItem('playerId') || `player_${Date.now()}`;
    localStorage.setItem('playerId', playerId);
    analytics.setPlayerId(playerId);
  }, []);

  // Combine the original players with parsed JSON data
  const allPlayers = React.useMemo(() => {
    return [...players, ...parsedPlayers];
  }, [players, parsedPlayers]);

  // Extract all available features from players
  const { teams, roles, nationalities } = extractFeatures(allPlayers);

  // Find players matching specific criteria with mixed feature types
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

  // Generate features for a specific type
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

  // Generate valid cells with answers for a 3x3 grid
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

  // Fallback grid generation
  const generateFallbackGrid = (): {
    cells: GameCell[], 
    rowHeaders: {feature: string, type: FeatureCategory}[],
    colHeaders: {feature: string, type: FeatureCategory}[]
  } => {
    const MINIMUM_ANSWERS_PER_QUESTION = 3;
    
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
        // console.log(`Single Player Strategy ${strategyIndex + 1} has duplicate features, skipping...`);
        continue;
      }
      
      const validCells: GameCell[] = [];
      
      // console.log(`Trying single player fallback strategy ${strategyIndex + 1} with ${MINIMUM_ANSWERS_PER_QUESTION}+ answers requirement...`);
      
      for (let r = 0; r < rows.length; r++) {
        for (let c = 0; c < cols.length; c++) {
          const rowHeader = rows[r];
          const colHeader = cols[c];
          
          if ((rowHeader.type === "nationality" && colHeader.type === "nationality") || 
              (rowHeader.type === "role" && colHeader.type === "role")) {
            // console.log(`Skipping invalid ${rowHeader.type}-${colHeader.type} combination`);
            continue;
          }
          
          const players = findPlayersForCriteria(
            rowHeader.feature,
            colHeader.feature,
            rowHeader.type,
            colHeader.type
          );
          
          // console.log(`Single Player Cell [${r},${c}] (${rowHeader.feature} × ${colHeader.feature}): ${players.length} players found`);
          
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
            // console.log(`  ❌ Rejected: Only ${players.length} answers (need ${MINIMUM_ANSWERS_PER_QUESTION})`);
          }
        }
      }
      
      if (validCells.length >= 7) { // Still require at least 7 valid cells
        // console.log(`✅ Using single player fallback combination ${strategyIndex + 1} with ${validCells.length} cells (all ${MINIMUM_ANSWERS_PER_QUESTION}+ answers)`);
        return { cells: validCells, rowHeaders: rows, colHeaders: cols };
      }
    }
    
    // console.log(`❌ Even single player fallback combinations didn't produce enough cells with ${MINIMUM_ANSWERS_PER_QUESTION}+ answers`);
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
    
    // console.log(`Attempting to generate a complete ${GRID_SIZE}x${GRID_SIZE} single player grid with at least ${MINIMUM_ANSWERS_PER_QUESTION} answers per question...`);
    
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
        
        // console.log(`Single Player Attempt ${attempt + 1}: Found grid with ${bestCellCount}/${expectedCellCount} valid cells (all with ${MINIMUM_ANSWERS_PER_QUESTION}+ answers)`);
        
        // Log answer counts for verification
        grid.cells.forEach((cell, index) => {
          // console.log(`  Single Player Cell ${index + 1} (${cell.rowFeature} × ${cell.colFeature}): ${cell.players.length} answers`);
        });
        
        if (bestCellCount === expectedCellCount) {
          // console.log(`✅ Complete single player grid found with all questions having ${MINIMUM_ANSWERS_PER_QUESTION}+ answers on attempt ${attempt + 1}!`);
          break;
        }
      } else if (grid.cells.length > 0) {
        // Log why this grid was rejected
        const insufficientCells = grid.cells.filter(cell => 
          cell.players.length < MINIMUM_ANSWERS_PER_QUESTION
        );
        
        if (insufficientCells.length > 0) {
          // console.log(`Single Player Attempt ${attempt + 1}: Rejected grid - ${insufficientCells.length} cells have insufficient answers:`);
          insufficientCells.forEach(cell => {
            // console.log(`  ${cell.rowFeature} × ${cell.colFeature}: only ${cell.players.length} answers (need ${MINIMUM_ANSWERS_PER_QUESTION})`);
          });
        }
      }
      
      if (attempt % 20 === 19) {
        // console.log(`Single Player Progress: ${attempt + 1}/${maxAttempts} attempts completed. Best valid grid: ${bestCellCount}/${expectedCellCount} cells`);
      }
    }
    
    if (bestCellCount < expectedCellCount) {
      // console.log(`⚠️ Could not generate complete single player grid with ${MINIMUM_ANSWERS_PER_QUESTION}+ answers per question (best: ${bestCellCount}/${expectedCellCount}). Trying fallback strategies...`);
      
      const fallbackGrid = generateFallbackGrid();
      
      // Check fallback grid for minimum answers too
      const validFallbackCells = fallbackGrid.cells.filter(cell => 
        cell.players.length >= MINIMUM_ANSWERS_PER_QUESTION
      );
      
      if (validFallbackCells.length > bestCellCount) {
        // console.log(`📋 Using single player fallback grid with ${validFallbackCells.length} valid cells (${MINIMUM_ANSWERS_PER_QUESTION}+ answers each)`);
        return {
          ...fallbackGrid,
          cells: validFallbackCells // Only return cells with enough answers
        };
      }
    }
    
    return bestGrid;
  };

  // Replace line 569 and the initialization check:
const initializeGame = async () => {
  const maxGenerationAttempts = 3;
  
  if (generationAttempts >= maxGenerationAttempts) {
    setGameGenerationError(
      'Tek oyuncu oyunu için yeterli oyuncu verisi bulunamadı. Her soru için en az 3 farklı cevap gerekli.'
    );
    setIsGeneratingGame(false);
    return;
  }

  try {
    setIsGeneratingGame(true);
    setGenerationAttempts(prev => prev + 1);

    console.log('🎮 Starting optimized single player game generation...');
    
    // Initialize the generator with ALL players (including JSON data)
    // FIXED: Use isInitialized property instead of getIsInitialized() method
    if (!questionGenerator.isInitialized) {
      console.log('Initializing question generator with all players:', allPlayers.length);
      await questionGenerator.initialize(allPlayers);
    }

    // Check if we can generate enough questions
    if (!questionGenerator.canGenerate(9, 'mixed')) {
      throw new Error('Not enough valid combinations available');
    }

    // Generate questions using optimized algorithm
    const generatedQuestions = questionGenerator.generateQuestions(9, 'mixed', true, true);
    
    if (generatedQuestions.length < 9) {
      throw new Error(`Only generated ${generatedQuestions.length}/9 questions`);
    }

    console.log('✅ Questions generated successfully:', generatedQuestions.length);

    // Create the game on the backend
    const playerId = localStorage.getItem('playerId') || `player_${Date.now()}`;
    localStorage.setItem('playerId', playerId);

    const gameData = await gameApi.createGame(
      playerId,
      `session_${Date.now()}`,
      'single',
      generatedQuestions
    );

    // Set up the game state
    setCurrentGameId(gameData.game.id);
    setGameQuestions(gameData.questions || generatedQuestions);
    
    // Create grid from questions using allPlayers for finding criteria
    const gridSize = 3;
    const newValidCells: GameCell[] = generatedQuestions.map((q, index) => ({
      row: Math.floor(index / gridSize),
      col: index % gridSize,
      rowFeature: q.rowFeature,
      rowFeatureType: q.rowFeatureType,
      colFeature: q.colFeature,
      colFeatureType: q.colFeatureType,
      players: findPlayersForCriteria(q.rowFeature, q.colFeature, q.rowFeatureType, q.colFeatureType)
    }));

    setValidCells(newValidCells);
    
    // Set headers
    const uniqueRows = Array.from(new Set(generatedQuestions.map(q => q.rowFeature)))
      .slice(0, 3)
      .map((feature, index) => {
        const question = generatedQuestions.find(q => q.rowFeature === feature);
        return { feature, type: question?.rowFeatureType || 'team' };
      });

    const uniqueCols = Array.from(new Set(generatedQuestions.map(q => q.colFeature)))
      .slice(0, 3)
      .map((feature, index) => {
        const question = generatedQuestions.find(q => q.colFeature === feature);
        return { feature, type: question?.colFeatureType || 'role' };
      });

    setHeaderRows(uniqueRows);
    setHeaderCols(uniqueCols);
    setIsGeneratingGame(false);

    console.log('🎉 Single player game initialized successfully!');
    console.log('📊 Game stats:', questionGenerator.getStats());

  } catch (error) {
    console.error('❌ Failed to generate game:', error);
    setTimeout(() => {
      initializeGame();
    }, 100);
  }
};

  // Initialize game when component mounts
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

  // Find players for a specific cell
  const getPlayersAtCell = (rowIndex: number, colIndex: number): EnhancedPlayer[] => {
    const cell = validCells.find(c => c.row === rowIndex && c.col === colIndex);
    if (!cell) return [];
    return cell.players;
  };

  // Console'a doğru cevapları yazdır
  const logCorrectAnswers = (cells: GameCell[]) => {
    // console.log("=== Single Player Game - Doğru Cevaplar ===");
    for (const cell of cells) {
      // console.log(`Hücre [${cell.row}][${cell.col}] (${cell.rowFeatureType}: ${cell.rowFeature} - ${cell.colFeatureType}: ${cell.colFeature}):`);
      // console.log(cell.players.map(p => p.name));
    }
  };

  // Remove cell click analytics - just handle the UI
  const onCellClick = (r: number, c: number) => {
    // Check if this cell has already been answered
    const isAnswered = answeredCells.some(cell => cell.row === r && cell.col === c);
    if (isAnswered) return;

    // Check if this is a valid cell with players
    const hasPlayers = validCells.some(cell => cell.row === r && cell.col === c);
    
    if (hasPlayers) {
      setSelectedCell([r, c]);
      setGuessResult(null);
    }
  };

  // Helper function to normalize text for comparison
  const normalizeText = (text: string): string => {
    return text
      .toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  // Update the onGuess function with Firebase integration
  const onGuess = async (guess: string) => {
    if (!selectedCell || !currentGameId) return;

    const [row, col] = selectedCell;
    const candidates = getPlayersAtCell(row, col);
    const cell = validCells.find(c => c.row === row && c.col === col);
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

    // Update your answer submission (around line 800):
    try {
      // Get player ID
      const playerId = localStorage.getItem('playerId') || `player_${Date.now()}`;
      
      // Submit answer with clean data structure
      const answerData = {
        playerId: playerId,
        questionNumber: question.questionNumber,
        playerName: guess,  // The actual guess
        rowFeature: question.rowFeature,
        colFeature: question.colFeature,
        // Your tracking data
        isCorrect: correct,
        matchedPlayerName: matchedPlayer?.name || null
      };

      const result = await gameApi.submitAnswer(currentGameId, answerData);
      
      console.log('💾 Answer submitted:', {
        guess: guess,
        isCorrect: result.validation.isCorrect,
        matchedPlayer: result.validation.matchedPlayer,
        backendResponse: result
      });

      // Handle the result
      if (result.validation.isCorrect) {
        console.log(`✅ Correct! Matched: ${result.validation.matchedPlayer}`);
        // Update UI for correct answer
      } else {
        console.log(`❌ Incorrect guess: ${guess}`);
        // Update UI for incorrect answer
      }

    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
    
    setGuessResult(correct);
    
    if (correct) {
      if (matchedPlayer) {
        // console.log(`Correct guess: "${guess}" matched "${matchedPlayer.name}"`);
      }
      
      const newAnsweredCells = [...answeredCells, { 
        row: selectedCell[0], 
        col: selectedCell[1], 
        player: 1 as 1, 
        correctAnswer: matchedPlayer?.name || guess 
      }];
      
      setAnsweredCells(newAnsweredCells);
      
      // Check if single player game is complete
      if (newAnsweredCells.length === validCells.length) {
        try {
          const playerId = localStorage.getItem('playerId');
          await gameApi.endGame(currentGameId, playerId || undefined); // Player wins by completing
          // console.log('🏁 Single player game completed and saved to backend');
        } catch (error) {
          console.error('Failed to end single player game:', error);
        }
      }
    }
  };

  const resetGuess = () => {
    setSelectedCell(null);
    setGuessResult(null);
  };

  // Update the newGame function to generate fresh questions:
const newGame = async () => {
  // End current game if exists
  if (currentGameId) {
    try {
      await gameApi.endGame(currentGameId);
    } catch (error) {
      console.error('Failed to end previous single player game:', error);
    }
  }

  // Track game end for analytics
  analytics.trackEvent('game_end', {
    gameMode: 'single',
    gridInfo: {
      totalCells: 9,
      validCells: validCells.length,
      answeredCells: answeredCells.length
    },
    score: answeredCells.length
  });

  // Reset state
  setCurrentGameId(null);
  setGameQuestions([]);
  setAnsweredCells([]);
  setSelectedCell(null);
  setGuessResult(null);
  setGameGenerationError(null);
  setGenerationAttempts(0);
  
  // DON'T reset gameInitialized - we want to keep the generator initialized
  // but generate fresh questions
  
  // Generate new game with fresh questions
  await generateNewGameWithFreshQuestions();
};

// Update the generateNewGameWithFreshQuestions function:
const generateNewGameWithFreshQuestions = async () => {
  const maxGenerationAttempts = 3;
  
  if (generationAttempts >= maxGenerationAttempts) {
    setGameGenerationError(
      'Tek oyuncu oyunu için yeterli oyuncu verisi bulunamadı. Her soru için en az 3 farklı cevap gerekli.'
    );
    setIsGeneratingGame(false);
    return;
  }

  try {
    setIsGeneratingGame(true);
    setGenerationAttempts(prev => prev + 1);

    console.log('🎮 Generating NEW single player game with fresh questions...');
    
    // Ensure generator is initialized with all players
    // FIXED: Use isInitialized property instead of getIsInitialized() method
    if (!questionGenerator.isInitialized) {
      console.log('Initializing question generator with all players:', allPlayers.length);
      await questionGenerator.initialize(allPlayers);
    }

    // Check if we can generate enough questions
    if (!questionGenerator.canGenerate(9, 'mixed')) {
      throw new Error('Not enough valid combinations available');
    }

    // Generate FRESH questions using the new method
    const generatedQuestions = questionGenerator.generateFreshQuestions(9, 'mixed', true, true);
    
    if (generatedQuestions.length < 9) {
      throw new Error(`Only generated ${generatedQuestions.length}/9 questions`);
    }

    console.log('✅ FRESH questions generated successfully:', generatedQuestions.length);

    // Create the game on the backend
    const playerId = localStorage.getItem('playerId') || `player_${Date.now()}`;
    localStorage.setItem('playerId', playerId);

    const gameData = await gameApi.createGame(
      playerId,
      `session_${Date.now()}`,
      'single',
      generatedQuestions
    );

    // Set up the game state
    setCurrentGameId(gameData.game.id);
    setGameQuestions(gameData.questions || generatedQuestions);
    
    // Create grid from questions
    const gridSize = 3;
    const newValidCells: GameCell[] = generatedQuestions.map((q, index) => ({
      row: Math.floor(index / gridSize),
      col: index % gridSize,
      rowFeature: q.rowFeature,
      rowFeatureType: q.rowFeatureType,
      colFeature: q.colFeature,
      colFeatureType: q.colFeatureType,
      players: findPlayersForCriteria(q.rowFeature, q.colFeature, q.rowFeatureType, q.colFeatureType)
    }));

    setValidCells(newValidCells);
    
    // Set headers
    const uniqueRows = Array.from(new Set(generatedQuestions.map(q => q.rowFeature)))
      .slice(0, 3)
      .map((feature, index) => {
        const question = generatedQuestions.find(q => q.rowFeature === feature);
        return { feature, type: question?.rowFeatureType || 'team' };
      });

    const uniqueCols = Array.from(new Set(generatedQuestions.map(q => q.colFeature)))
      .slice(0, 3)
      .map((feature, index) => {
        const question = generatedQuestions.find(q => q.colFeature === feature);
        return { feature, type: question?.colFeatureType || 'role' };
      });

    setHeaderRows(uniqueRows);
    setHeaderCols(uniqueCols);
    setIsGeneratingGame(false);

    console.log('🎉 NEW single player game with fresh questions initialized successfully!');
    console.log('📊 Game stats:', questionGenerator.getStats());

  } catch (error) {
    console.error('❌ Failed to generate fresh game:', error);
    setTimeout(() => {
      generateNewGameWithFreshQuestions();
    }, 100);
  }
};

  // Türkçe karşılıklarını göster
  const getFeatureTypeName = (type: FeatureCategory | null): string => {
    if (!type) return "";
    switch (type) {
      case "team": return "Takım";
      case "role": return "Mevki";
      case "nationality": return "Ülke";
      default: return "";
    }
  };

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
        <h1 style={{ margin: 0, fontSize: '2rem' }}>Futbolcu Tahmin Oyunu</h1>
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
          Single Player Game ID: {currentGameId}
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
            🎲 Oyun Oluşturuluyor...
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
            ❌ Oyun Oluşturulamadı
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
          marginBottom: '10px', 
          fontSize: '14px', 
          color: '#666',
          display: 'flex',
          gap: '20px',
          minHeight: '20px'
        }}>
          <span>Doğru: {answeredCells.length}</span>
          <span>Kalan: {validCells.length - answeredCells.length}</span>
          <span>Toplam: {validCells.length}</span>
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
          marginBottom: '20px',
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
      {selectedCell !== null && !isGeneratingGame && !gameGenerationError && (
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

export default Game;