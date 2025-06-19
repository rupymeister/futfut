import React, { useState, useEffect } from 'react';
import { type EnhancedPlayer } from '../types/playerTypes';
import { type FeatureCategory } from '../utils/featureUtils';

interface PlayerGuessProps {
  playersAtCell: EnhancedPlayer[];
  onGuess: (guess: string) => void;
  guessResult: boolean | null;
  onReset: () => void;
  rowFeature?: string;
  rowFeatureType?: FeatureCategory;
  colFeature?: string;
  colFeatureType?: FeatureCategory;
}

export default function PlayerGuess({ 
  playersAtCell, 
  onGuess, 
  guessResult, 
  onReset,
  rowFeature,
  rowFeatureType,
  colFeature,
  colFeatureType
}: PlayerGuessProps) {
  const [guess, setGuess] = useState('');
  const [isOpen, setIsOpen] = useState(true);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  useEffect(() => {
    setGuess('');
    setIsOpen(true);
    setFeedbackMessage(null);
  }, [playersAtCell]);

  useEffect(() => {
    if (guessResult === true) {
      setFeedbackMessage('Doğru cevap!');
      
      const timer = setTimeout(() => {
        handleClose();
      }, 1200);
      
      return () => clearTimeout(timer);
    } else if (guessResult === false) {
      setFeedbackMessage('Yanlış tahmin, tekrar deneyin.');
    }
  }, [guessResult]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim()) {
      onGuess(guess.trim());
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setGuess('');
    onReset();
  };

  const handleCancel = () => {
    handleClose();
  };

  const handleOutsideClick = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).classList.contains('dialog-overlay')) {
      handleClose();
    }
  };

  const getFeatureTypeName = (type: FeatureCategory): string => {
    switch (type) {
      case "team": return "Takım";
      case "role": return "Mevki";
      case "nationality": return "Ülke";
      default: return "";
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="dialog-overlay"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={handleOutsideClick}
    >
      <div 
        className="dialog-content"
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '24px',
          minWidth: '320px',
          maxWidth: '450px',
          width: '90%',
          maxHeight: '80vh',
          boxShadow: '0 4px 8px rgba(0, 0, 0, 0.2)',
          position: 'relative'
        }}
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={handleClose}
          style={{
            position: 'absolute',
            top: '8px',
            right: '8px',
            border: 'none',
            background: 'none',
            fontSize: '16px',
            cursor: 'pointer',
            color: '#666',
            padding: '4px'
          }}
        >
          ✕
        </button>

        <h2 style={{ 
          marginTop: 0, 
          fontSize: '1.4rem',
          marginBottom: '20px',
          color: '#2c3e50',
          textAlign: 'center'
        }}>
          🎯 Futbolcu Tahmini
        </h2>
        
        {/* Kriterleri göster */}
        {rowFeature && rowFeatureType && colFeature && colFeatureType && (
          <div style={{
            backgroundColor: '#f8f9fa',
            border: '2px solid #e9ecef',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            <h3 style={{ 
              margin: '0 0 12px 0',
              fontSize: '1.1rem',
              color: '#495057'
            }}>
              Aradığınız Kriterler:
            </h3>
            
            <div style={{
              display: 'flex',
              justifyContent: 'space-around',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              {/* Row Feature */}
              <div style={{
                backgroundColor: '#3498db',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                textAlign: 'center',
                minWidth: '100px'
              }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  {getFeatureTypeName(rowFeatureType)}
                </div>
                <div>{rowFeature}</div>
              </div>
              
              {/* Intersection symbol */}
              <div style={{
                fontSize: '1.5rem',
                color: '#6c757d',
                fontWeight: 'bold'
              }}>
                ∩
              </div>
              
              {/* Column Feature */}
              <div style={{
                backgroundColor: '#e74c3c',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '0.9rem',
                textAlign: 'center',
                minWidth: '100px'
              }}>
                <div style={{ fontSize: '0.8rem', opacity: 0.9 }}>
                  {getFeatureTypeName(colFeatureType)}
                </div>
                <div>{colFeature}</div>
              </div>
            </div>
          </div>
        )}
        
        <p style={{ 
          marginBottom: '15px',
          fontSize: '0.95rem',
          lineHeight: '1.5',
          color: '#495057',
          textAlign: 'center'
        }}>
          Bu kriterleri karşılayan futbolcuyu tahmin edin:
          <br />
          <small style={{ color: '#6c757d', fontSize: '0.85rem' }}>
            Futbolcu adını tam veya kısmi olarak yazabilirsiniz
          </small>
        </p>

        {feedbackMessage && (
          <div
            style={{
              padding: '10px 12px',
              marginBottom: '15px',
              borderRadius: '6px',
              backgroundColor: guessResult === true ? '#d4edda' : '#f8d7da',
              color: guessResult === true ? '#155724' : '#721c24',
              border: `1px solid ${guessResult === true ? '#c3e6cb' : '#f5c6cb'}`,
              fontSize: '0.9rem',
              textAlign: 'center',
              fontWeight: 'bold'
            }}
          >
            {feedbackMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            placeholder="Futbolcu adını yazın..."
            style={{
              width: '100%',
              padding: '12px 16px',
              fontSize: '15px',
              border: '2px solid #dee2e6',
              borderRadius: '6px',
              boxSizing: 'border-box',
              marginBottom: '15px',
              outline: 'none',
              transition: 'border-color 0.2s ease'
            }}
            autoFocus
            disabled={guessResult === true}
            onFocus={(e) => e.target.style.borderColor = '#3498db'}
            onBlur={(e) => e.target.style.borderColor = '#dee2e6'}
          />
          
          <div style={{ 
            display: 'flex', 
            justifyContent: 'flex-end',
            gap: '10px'
          }}>
            <button
              type="button"
              onClick={handleCancel}
              style={{
                padding: '10px 20px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                transition: 'background-color 0.2s ease'
              }}
            >
              İptal
            </button>
            
            <button
              type="submit"
              disabled={guessResult === true}
              style={{
                padding: '10px 20px',
                backgroundColor: guessResult === true ? '#27ae60' : '#3498db',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                cursor: guessResult === true ? 'default' : 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                opacity: guessResult === true ? 0.9 : 1,
                transition: 'background-color 0.2s ease'
              }}
            >
              {guessResult === true ? '✓ Doğru!' : 'Tahmin Et'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}