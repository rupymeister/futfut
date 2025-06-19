// Create a new file: src/components/GameModeSelector.tsx
import React from 'react';

interface GameModeSelectorProps {
  onModeSelect: (mode: 'single' | 'multiplayer') => void;
}

export function GameModeSelector({ onModeSelect }: GameModeSelectorProps) {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#ecf0f1',
      padding: '20px'
    }}>
      <h1 style={{
        fontSize: '2.5rem',
        color: '#2c3e50',
        marginBottom: '2rem',
        textAlign: 'center'
      }}>
        Futbolcu Tahmin Oyunu
      </h1>
      
      <p style={{
        fontSize: '1.2rem',
        color: '#7f8c8d',
        marginBottom: '3rem',
        textAlign: 'center',
        maxWidth: '600px'
      }}>
        Futbolcuları tahmin ederek 3x3 gridde tüm hücreleri doldurmaya çalışın!
      </p>

      <div style={{
        display: 'flex',
        gap: '2rem',
        flexDirection: window.innerWidth < 768 ? 'column' : 'row'
      }}>
        <button
          onClick={() => onModeSelect('single')}
          style={{
            padding: '20px 40px',
            fontSize: '1.3rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            minWidth: '200px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#2980b9';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#3498db';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          🎯 Tek Oyuncu
        </button>

        <button
          onClick={() => onModeSelect('multiplayer')}
          style={{
            padding: '20px 40px',
            fontSize: '1.3rem',
            backgroundColor: '#e74c3c',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            minWidth: '200px',
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#c0392b';
            e.currentTarget.style.transform = 'translateY(-2px)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#e74c3c';
            e.currentTarget.style.transform = 'translateY(0)';
          }}
        >
          👥 İki Oyuncu
        </button>
      </div>

      <div style={{
        marginTop: '3rem',
        padding: '20px',
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        maxWidth: '500px'
      }}>
        <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>Oyun Kuralları:</h3>
        <ul style={{ color: '#7f8c8d', lineHeight: '1.6' }}>
          <li><strong>Tek Oyuncu:</strong> Tüm hücreleri doğru tahminlerle doldurmaya çalışın</li>
          <li><strong>İki Oyuncu:</strong> Sırayla tahmin yapın, en çok hücreyi dolduran kazanır</li>
          <li>Her hücre takım, mevki ve ülke kriterlerinin kesişimindeki futbolcuyu temsil eder</li>
          <li>Futbolcu adlarını tam veya kısmi olarak yazabilirsiniz</li>
        </ul>
      </div>
    </div>
  );
}