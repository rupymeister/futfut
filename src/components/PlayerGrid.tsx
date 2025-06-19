import React, { useState } from 'react';
import { type FeatureCategory } from '../utils/featureUtils';

interface PlayerGridProps {
  rowHeaders: {feature: string, type: FeatureCategory}[];
  colHeaders: {feature: string, type: FeatureCategory}[];
  onCellClick: (r: number, c: number) => void;
  selectedCell?: [number, number];
  activeCells: Array<[number, number]>;
  answeredCells: Array<{
    row: number, 
    col: number, 
    player: 1 | 2,
    correctAnswer: string
  }>; // Updated to accept full answered cell data
  getFeatureTypeName: (type: FeatureCategory | null) => string;
}

// Map country names to their flag IDs
const countryFlagMap: Record<string, string> = {
  "Türkiye": "174",
  "Almanya": "40",
  "İspanya": "157",
  "Brezilya": "26",
  "Hollanda": "122",
  "ABD": "184",
  "Fransa": "50",
  "Hırvatistan": "37",
  "Danimarka": "39",
  "Gana": "54",
  "Kamerun": "31",
  "Yunanistan": "56",
  "Rusya": "141",
  "İsviçre": "148",
  "İtalya": "75",
  "Avusturya": "127",
  "Peru": "133",
  "İran": "71",
  "Belçika": "19",
  "Cezayir": "4"
  // Add more country mappings as needed
};

// Common IDs used in Transfermarkt flag URLs
const countryNameToCode: Record<string, string> = {
  "Diğer": "0", 
  "Arnavutluk": "3",
  "Arjantin": "9",
  "Ermenistan": "12",
  "Avustralya": "14",
  "Azerbaycan": "15",
  "Bosna Hersek": "24",
  "Bulgaristan": "28",
  "Kanada": "80",
  "Şili": "33",
  "Çin": "34",
  "Kolombiya": "36",
  "Kosta Rika": "38",
  "Çek Cumhuriyeti": "172",
  "Ekvador": "44",
  "Mısır": "45",
  "İngiltere": "189",
  "Finlandiya": "48",
  "Gürcistan": "53",
  "Yunanistan": "56",
  "Macaristan": "180",
  "İzlanda": "76",
  "İsrail": "77",
  "Fildişi Sahili": "38",
  "Jamaika": "82",
  "Japonya": "83",
  "Kazakistan": "86",
  "Kuzey Kore": "123",
  "Güney Kore": "87",
  "Kosova": "244",
  "Meksika": "110",
  "Karadağ": "216",
  "Fas": "107",
  "Yeni Zelanda": "118",
  "Nijerya": "124",
  "Kuzey Makedonya": "97",
  "Norveç": "125",
  "Paraguay": "132",
  "Polonya": "135",
  "Portekiz": "136",
  "Katar": "137",
  "Romanya": "140",
  "Sırbistan": "215",
  "Slovakya": "154",
  "Slovenya": "155",
  "Güney Afrika": "159",
  "İsveç": "147",
  "Ukrayna": "177",
  "Uruguay": "179",
  "Venezuela": "195",
  "Galler": "191"
};

// Modern color palette
const colors = {
  primary: '#2c3e50',       // Dark blue-gray for headers
  secondary: '#3498db',     // Bright blue for selected
  text: '#2c3e50',          // Dark text
  textLight: '#7f8c8d',     // Light text for small elements
  background: '#ecf0f1',    // Light gray background
  hover: '#e0f7fa',         // Light blue for hover
  border: '#bdc3c7',        // Light border
  success: '#27ae60',       // Green for correct answers
  error: '#e74c3c',         // Red for errors
  inactive: '#f5f5f5'       // Very light gray for inactive
};

const FIXED_GRID_DIMENSIONS = {
  containerWidth: '600px',
  containerHeight: '600px',
  cellWidth: '120px',
  cellHeight: '120px',
  headerWidth: '120px',
  headerHeight: '60px',
  fontSize: '14px',
  padding: '8px'
};


export function PlayerGrid({ 
  rowHeaders,
  colHeaders,
  onCellClick,
  selectedCell,
  activeCells,
  answeredCells,
  getFeatureTypeName
}: PlayerGridProps) {
  
  const [flagErrors, setFlagErrors] = useState<Record<string, boolean>>({});
  const [hoveredCell, setHoveredCell] = useState<[number, number] | null>(null);
  
  
  const cellStyle = {
    width: '110px',
    height: '90px',
    border: `1px solid ${colors.border}`,
    textAlign: 'center' as const,
    cursor: 'pointer',
    verticalAlign: 'middle',
    padding: '10px',
    color: colors.text,
    transition: 'all 0.2s ease',
    fontSize: '16px',
    fontWeight: 'normal' as const,
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
  };
  
  const headerStyle = {
    ...cellStyle,
    backgroundColor: colors.primary,
    color: 'white',
    fontWeight: 'bold' as const,
    cursor: 'default' as const,
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
  };
  
  const selectedStyle = {
    ...cellStyle,
    backgroundColor: colors.secondary,
    color: 'white',
    border: `2px solid ${colors.secondary}`,
    boxShadow: '0 4px 6px rgba(52, 152, 219, 0.3)'
  };

  const hoveredStyle = {
    ...cellStyle,
    backgroundColor: colors.hover,
    transform: 'translateY(-2px)',
    boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
  };
  
  // Add a style for answered cells
  const answeredStyle = {
    ...cellStyle,
    backgroundColor: colors.success,
    color: 'white',
    cursor: 'default',
    boxShadow: '0 2px 4px rgba(39, 174, 96, 0.3)'
  };


  // Player colors
  const getPlayerColor = (player: 1 | 2): string => {
    return player === 1 ? '#3498db' : '#e74c3c'; // Blue for Player 1, Red for Player 2
  };

  // Check if a cell is active (has valid players)
  const isCellActive = (r: number, c: number): boolean => {
    return activeCells.some(cell => cell[0] === r && cell[1] === c);
  };
  
  // Helper function to check if a cell has been answered and get answer data
  const getCellAnswerData = (r: number, c: number): {
    isAnswered: boolean;
    player?: 1 | 2;
    correctAnswer?: string;
  } => {
    const answeredCell = answeredCells.find(cell => cell.row === r && cell.col === c);
    if (answeredCell) {
      return {
        isAnswered: true,
        player: answeredCell.player,
        correctAnswer: answeredCell.correctAnswer
      };
    }
    return { isAnswered: false };
  };
  
  // Helper function to check if a cell has been answered
  const isCellAnswered = (r: number, c: number): boolean => {
    return answeredCells.some(cell => cell.row === r && cell.col === c);
  };

  // Handle image loading errors
  const handleFlagError = (country: string) => {
    setFlagErrors(prev => ({ ...prev, [country]: true }));
  };

  // Render feature content based on feature type
  const renderFeatureContent = (featureType: FeatureCategory, feature: string) => {
    if (featureType === 'nationality') {
      // Skip rendering flag if we've already had an error with this country
      if (flagErrors[feature]) {
        return (
          <>
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{feature}</span>
            <br />
            <small style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              ({getFeatureTypeName(featureType)})
            </small>
          </>
        );
      }

      // First try the mapped ID if available
      let flagId = countryFlagMap[feature] || '';
      
      // If not in our map, try the name-to-code map
      if (!flagId) {
        flagId = countryNameToCode[feature] || '';
      }
      
      // If we have neither, use the country name directly (might work for some countries)
      if (!flagId && feature !== 'Diğer') {
        // Try to generate a URL from country name
        return (
          <>
            <img 
              src={`https://tmssl.akamaized.net//images/flagge/verysmall/${feature.toLowerCase()}.png?lm=1520611569`}
              alt={feature}
              style={{ width: '24px', height: '16px', marginRight: '5px', verticalAlign: 'middle' }}
              onError={() => handleFlagError(feature)}
            />
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{feature}</span>
            <br />
            <small style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              ({getFeatureTypeName(featureType)})
            </small>
          </>
        );
      }
      
      // If we have a flagId (either from map or generated)
      if (flagId) {
        return (
          <>
            <img 
              src={`https://tmssl.akamaized.net//images/flagge/verysmall/${flagId}.png?lm=1520611569`}
              alt={feature}
              style={{ width: '24px', height: '16px', marginRight: '5px', verticalAlign: 'middle' }}
              onError={() => handleFlagError(feature)}
            />
            <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{feature}</span>
            <br />
            <small style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
              ({getFeatureTypeName(featureType)})
            </small>
          </>
        );
      }
    }
    return (
      <>
        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>{feature}</span>
        <br />
        <small style={{ color: 'rgba(255,255,255,0.8)', fontSize: '12px' }}>
          ({getFeatureTypeName(featureType)})
        </small>
      </>
    );
  };

  return (
    <div 
      style={{ 
        overflowX: 'auto', 
        marginBottom: '20px',
        backgroundColor: colors.background,
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
      }}
    >
      <table style={{ 
        borderCollapse: 'separate', 
        borderSpacing: '4px',
        margin: '0 auto'
      }}>
        <thead>
          <tr>
            <th style={{ 
              ...headerStyle, 
              borderTopLeftRadius: '6px',
              backgroundColor: '#1a2530',
              width: '40px',
              height: '40px'
            }}></th>
            {colHeaders.map((header, i) => (
              <th 
                key={`col-${i}`} 
                style={{ 
                  ...headerStyle,
                  borderTopRightRadius: i === colHeaders.length - 1 ? '6px' : '0'
                }}
              >
                {renderFeatureContent(header.type, header.feature)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rowHeaders.map((header, r) => (
            <tr key={`row-${r}`}>
              <th 
                style={{ 
                  ...headerStyle,
                  borderBottomLeftRadius: r === rowHeaders.length - 1 ? '6px' : '0',
                }} 
              >
                {renderFeatureContent(header.type, header.feature)}
              </th>
              {colHeaders.map((_, c) => {
                const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
                const isHovered = hoveredCell && hoveredCell[0] === r && hoveredCell[1] === c;
                const answerData = getCellAnswerData(r, c);
                const active = isCellActive(r, c);
                
                if (!active) return null;

                // Dynamic cell styling based on answer state
                let cellBackgroundColor = colors.background;
                let cellTextColor = colors.text;
                
                if (answerData.isAnswered && answerData.player) {
                  cellBackgroundColor = getPlayerColor(answerData.player);
                  cellTextColor = 'white';
                } else if (isSelected) {
                  cellBackgroundColor = colors.secondary;
                  cellTextColor = 'white';
                } else if (isHovered && !answerData.isAnswered) {
                  cellBackgroundColor = colors.hover;
                }

                const dynamicCellStyle = {
                  ...cellStyle,
                  backgroundColor: cellBackgroundColor,
                  color: cellTextColor,
                  cursor: answerData.isAnswered ? 'default' : 'pointer',
                  boxShadow: answerData.isAnswered 
                    ? `0 2px 4px ${getPlayerColor(answerData.player || 1)}40` 
                    : cellStyle.boxShadow
                };
                
                return (
                  <td 
                    key={`cell-${r}-${c}`} 
                    style={dynamicCellStyle}
                    onClick={() => !answerData.isAnswered && onCellClick(r, c)}
                    onMouseEnter={() => !answerData.isAnswered && setHoveredCell([r, c])}
                    onMouseLeave={() => !answerData.isAnswered && setHoveredCell(null)}
                  >
                    {answerData.isAnswered ? (
                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column',
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: '100%',
                        padding: '5px',
                        textAlign: 'center'
                      }}>
                        <div style={{ 
                          fontSize: '18px', 
                          marginBottom: '4px',
                          fontWeight: 'bold'
                        }}>
                          ✓
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          fontWeight: 'bold',
                          lineHeight: '1.2',
                          wordBreak: 'break-word',
                          maxWidth: '100%'
                        }}>
                          {answerData.correctAnswer}
                        </div>
                        <div style={{ 
                          fontSize: '10px', 
                          opacity: 0.9,
                          marginTop: '2px'
                        }}>
                          P{answerData.player}
                        </div>
                      </div>
                    ) : isSelected ? (
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        height: '100%',
                        fontSize: '20px',
                        fontWeight: 'bold'
                      }}>
                        ?
                      </div>
                    ) : (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        fontSize: '24px',
                        color: isHovered ? colors.secondary : '#95a5a6'
                      }}>
                        ?
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}