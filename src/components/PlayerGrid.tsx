import React, { useState, useEffect } from 'react';
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
  }>;
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
};

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
  primary: '#2c3e50',
  secondary: '#3498db',
  text: '#2c3e50',
  textLight: '#7f8c8d',
  background: '#ecf0f1',
  hover: '#e0f7fa',
  border: '#bdc3c7',
  success: '#27ae60',
  error: '#e74c3c',
  inactive: '#f5f5f5'
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
  const [screenSize, setScreenSize] = useState({
    width: typeof window !== 'undefined' ? window.innerWidth : 1200,
    height: typeof window !== 'undefined' ? window.innerHeight : 800
  });

  // Track screen size changes
  useEffect(() => {
    const handleResize = () => {
      setScreenSize({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Responsive dimensions based on screen size
  const getResponsiveDimensions = () => {
    const { width } = screenSize;
    
    if (width < 360) {
      // Very small phones (iPhone SE, etc.)
      return {
        cellWidth: '50px',
        cellHeight: '50px',
        headerWidth: '50px',
        headerHeight: '40px',
        fontSize: '9px',
        headerFontSize: '8px',
        padding: '2px',
        borderSpacing: '1px',
        containerPadding: '5px',
        flagSize: '12px',
        checkmarkSize: '12px'
      };
    } else if (width < 400) {
      // Small phones
      return {
        cellWidth: '60px',
        cellHeight: '60px',
        headerWidth: '60px',
        headerHeight: '45px',
        fontSize: '10px',
        headerFontSize: '9px',
        padding: '3px',
        borderSpacing: '2px',
        containerPadding: '8px',
        flagSize: '14px',
        checkmarkSize: '14px'
      };
    } else if (width < 480) {
      // Medium phones
      return {
        cellWidth: '70px',
        cellHeight: '70px',
        headerWidth: '70px',
        headerHeight: '50px',
        fontSize: '11px',
        headerFontSize: '10px',
        padding: '4px',
        borderSpacing: '2px',
        containerPadding: '10px',
        flagSize: '16px',
        checkmarkSize: '16px'
      };
    } else if (width < 600) {
      // Large phones / small tablets
      return {
        cellWidth: '85px',
        cellHeight: '85px',
        headerWidth: '85px',
        headerHeight: '55px',
        fontSize: '12px',
        headerFontSize: '11px',
        padding: '6px',
        borderSpacing: '3px',
        containerPadding: '15px',
        flagSize: '18px',
        checkmarkSize: '18px'
      };
    } else if (width < 768) {
      // Tablets
      return {
        cellWidth: '100px',
        cellHeight: '90px',
        headerWidth: '100px',
        headerHeight: '60px',
        fontSize: '13px',
        headerFontSize: '12px',
        padding: '8px',
        borderSpacing: '3px',
        containerPadding: '20px',
        flagSize: '20px',
        checkmarkSize: '20px'
      };
    } else {
      // Desktop
      return {
        cellWidth: '110px',
        cellHeight: '90px',
        headerWidth: '110px',
        headerHeight: '60px',
        fontSize: '14px',
        headerFontSize: '13px',
        padding: '10px',
        borderSpacing: '4px',
        containerPadding: '20px',
        flagSize: '24px',
        checkmarkSize: '18px'
      };
    }
  };

  const dimensions = getResponsiveDimensions();
  
  const cellStyle = {
    width: dimensions.cellWidth,
    height: dimensions.cellHeight,
    border: `1px solid ${colors.border}`,
    textAlign: 'center' as const,
    cursor: 'pointer',
    verticalAlign: 'middle',
    padding: dimensions.padding,
    color: colors.text,
    transition: 'all 0.2s ease',
    fontSize: dimensions.fontSize,
    fontWeight: 'normal' as const,
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    borderRadius: '4px'
  };
  
  const headerStyle = {
    ...cellStyle,
    backgroundColor: colors.primary,
    color: 'white',
    fontWeight: 'bold' as const,
    cursor: 'default' as const,
    fontSize: dimensions.headerFontSize,
    height: dimensions.headerHeight,
    boxShadow: '0 2px 4px rgba(0,0,0,0.15)'
  };
  
  const selectedStyle = {
    ...cellStyle,
    backgroundColor: colors.secondary,
    color: 'white',
    border: `2px solid ${colors.secondary}`,
    boxShadow: '0 2px 8px rgba(52, 152, 219, 0.4)'
  };

  const hoveredStyle = {
    ...cellStyle,
    backgroundColor: colors.hover,
    transform: 'scale(1.02)',
    boxShadow: '0 2px 8px rgba(0,0,0,0.15)'
  };
  
  const answeredStyle = {
    ...cellStyle,
    backgroundColor: colors.success,
    color: 'white',
    cursor: 'default',
    boxShadow: '0 2px 6px rgba(39, 174, 96, 0.3)'
  };

  // Player colors
  const getPlayerColor = (player: 1 | 2): string => {
    return player === 1 ? '#3498db' : '#e74c3c';
  };

  // Check if a cell is active
  const isCellActive = (r: number, c: number): boolean => {
    return activeCells.some(cell => cell[0] === r && cell[1] === c);
  };
  
  // Helper function to get cell answer data
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

  // Handle flag image errors
  const handleFlagError = (country: string) => {
    setFlagErrors(prev => ({ ...prev, [country]: true }));
  };

  // Render feature content with responsive sizing
  const renderFeatureContent = (featureType: FeatureCategory, feature: string, isHeader: boolean = false) => {
    const flagSize = isHeader ? `${parseInt(dimensions.flagSize) - 2}px` : dimensions.flagSize;
    const fontSize = isHeader ? dimensions.headerFontSize : dimensions.fontSize;
    
    if (featureType === 'nationality' && !flagErrors[feature]) {
      let flagId = countryFlagMap[feature] || countryNameToCode[feature] || '';
      
      if (flagId) {
        return (
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            gap: '2px'
          }}>
            <img 
              src={`https://tmssl.akamaized.net//images/flagge/verysmall/${flagId}.png?lm=1520611569`}
              alt={feature}
              style={{ 
                width: flagSize, 
                height: `${parseInt(flagSize) * 0.67}px`,
                objectFit: 'contain'
              }}
              onError={() => handleFlagError(feature)}
            />
            <span style={{ 
              fontSize: fontSize,
              fontWeight: isHeader ? 'bold' : 'normal',
              textAlign: 'center',
              lineHeight: '1.1',
              wordBreak: 'break-word'
            }}>
              {feature.length > 8 ? feature.substring(0, 6) + '...' : feature}
            </span>
            {screenSize.width > 400 && (
              <small style={{ 
                color: isHeader ? 'rgba(255,255,255,0.8)' : colors.textLight, 
                fontSize: `${parseInt(fontSize) - 2}px`,
                lineHeight: '1'
              }}>
                ({getFeatureTypeName(featureType)})
              </small>
            )}
          </div>
        );
      }
    }
    
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column', 
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        padding: '2px'
      }}>
        <span style={{ 
          fontSize: fontSize,
          fontWeight: isHeader ? 'bold' : 'normal',
          textAlign: 'center',
          lineHeight: '1.1',
          wordBreak: 'break-word'
        }}>
          {feature.length > 10 ? feature.substring(0, 8) + '...' : feature}
        </span>
        {screenSize.width > 400 && (
          <small style={{ 
            color: isHeader ? 'rgba(255,255,255,0.8)' : colors.textLight, 
            fontSize: `${parseInt(fontSize) - 2}px`,
            lineHeight: '1',
            marginTop: '2px'
          }}>
            ({getFeatureTypeName(featureType)})
          </small>
        )}
      </div>
    );
  };

  return (
    <div 
      style={{ 
        width: '100%',
        overflowX: 'auto',
        overflowY: 'hidden',
        marginBottom: '20px',
        backgroundColor: colors.background,
        padding: dimensions.containerPadding,
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        // Ensure proper scrolling on mobile
        WebkitOverflowScrolling: 'touch'
      }}
    >
      <div style={{
        minWidth: 'fit-content',
        display: 'flex',
        justifyContent: 'center'
      }}>
        <table style={{ 
          borderCollapse: 'separate', 
          borderSpacing: dimensions.borderSpacing,
          margin: '0'
        }}>
          <thead>
            <tr>
              <th style={{ 
                ...headerStyle,
                backgroundColor: '#1a2530',
                width: dimensions.headerWidth,
                height: dimensions.headerHeight,
                borderRadius: '6px 0 0 0'
              }}></th>
              {colHeaders.map((header, i) => (
                <th 
                  key={`col-${i}`} 
                  style={{ 
                    ...headerStyle,
                    width: dimensions.headerWidth,
                    borderRadius: i === colHeaders.length - 1 ? '0 6px 0 0' : '0'
                  }}
                >
                  {renderFeatureContent(header.type, header.feature, true)}
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
                    borderRadius: r === rowHeaders.length - 1 ? '0 0 0 6px' : '0',
                    width: dimensions.headerWidth
                  }} 
                >
                  {renderFeatureContent(header.type, header.feature, true)}
                </th>
                {colHeaders.map((_, c) => {
                  const isSelected = selectedCell && selectedCell[0] === r && selectedCell[1] === c;
                  const isHovered = hoveredCell && hoveredCell[0] === r && hoveredCell[1] === c;
                  const answerData = getCellAnswerData(r, c);
                  const active = isCellActive(r, c);
                  
                  if (!active) return null;

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
                      : cellStyle.boxShadow,
                    borderRadius: (r === rowHeaders.length - 1 && c === colHeaders.length - 1) ? '0 0 6px 0' : '4px'
                  };
                  
                  return (
                    <td 
                      key={`cell-${r}-${c}`} 
                      style={dynamicCellStyle}
                      onClick={() => !answerData.isAnswered && onCellClick(r, c)}
                      onMouseEnter={() => !answerData.isAnswered && setHoveredCell([r, c])}
                      onMouseLeave={() => !answerData.isAnswered && setHoveredCell(null)}
                      // Add touch event handlers for mobile
                      onTouchStart={() => !answerData.isAnswered && setHoveredCell([r, c])}
                      onTouchEnd={() => setHoveredCell(null)}
                    >
                      {answerData.isAnswered ? (
                        <div style={{ 
                          display: 'flex', 
                          flexDirection: 'column',
                          alignItems: 'center', 
                          justifyContent: 'center',
                          height: '100%',
                          padding: '2px',
                          textAlign: 'center'
                        }}>
                          <div style={{ 
                            fontSize: dimensions.checkmarkSize, 
                            marginBottom: '2px',
                            fontWeight: 'bold'
                          }}>
                            ✓
                          </div>
                          <div style={{ 
                            fontSize: `${parseInt(dimensions.fontSize) - 1}px`, 
                            fontWeight: 'bold',
                            lineHeight: '1.1',
                            wordBreak: 'break-word',
                            maxWidth: '100%'
                          }}>
                            {answerData.correctAnswer && answerData.correctAnswer.length > 10 
                              ? answerData.correctAnswer.substring(0, 8) + '...'
                              : answerData.correctAnswer}
                          </div>
                          <div style={{ 
                            fontSize: `${parseInt(dimensions.fontSize) - 2}px`, 
                            opacity: 0.9,
                            marginTop: '1px'
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
                          fontSize: `${parseInt(dimensions.fontSize) + 4}px`,
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
                          fontSize: `${parseInt(dimensions.fontSize) + 6}px`,
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
    </div>
  );
}