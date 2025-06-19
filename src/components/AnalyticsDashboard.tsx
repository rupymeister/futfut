import React, { useState, useEffect } from 'react';
import { analytics } from '../services/analytics';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

export function AnalyticsDashboard({ onClose }: AnalyticsDashboardProps) {
  const [stats, setStats] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [firebaseData, setFirebaseData] = useState<any>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    // Get local stats
    const localStats = analytics.getGameStats();
    const localEvents = analytics.getEvents();
    
    setStats(localStats);
    setEvents(localEvents.slice(-20)); // Last 20 events

    // Try to get Firebase data
    try {
      const fbData = await analytics.fetchAnalyticsFromFirebase();
      setFirebaseData(fbData);
    } catch (error) {
      console.warn('Could not fetch Firebase analytics:', error);
    }
  };

  const exportData = () => {
    const dataStr = analytics.exportData();
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `futbolcu-analytics-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
  };

  if (!stats) {
    return <div>Loading analytics...</div>;
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.8)',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '30px',
        borderRadius: '10px',
        maxWidth: '800px',
        maxHeight: '80vh',
        overflow: 'auto',
        width: '90%'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>📊 Game Analytics</h2>
          <button onClick={onClose} style={{ fontSize: '20px', background: 'none', border: 'none' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '15px', marginBottom: '20px' }}>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h3>Total Guesses</h3>
            <p style={{ fontSize: '24px', margin: 0, color: '#007bff' }}>{stats.totalGuesses}</p>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h3>Accuracy</h3>
            <p style={{ fontSize: '24px', margin: 0, color: '#28a745' }}>{stats.accuracy.toFixed(1)}%</p>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h3>Correct Guesses</h3>
            <p style={{ fontSize: '24px', margin: 0, color: '#28a745' }}>{stats.correctGuesses}</p>
          </div>
          <div style={{ padding: '15px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
            <h3>Games Completed</h3>
            <p style={{ fontSize: '24px', margin: 0, color: '#6f42c1' }}>{stats.gamesCompleted}</p>
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <h3>Recent Events</h3>
          <div style={{ maxHeight: '200px', overflow: 'auto', border: '1px solid #ddd', borderRadius: '5px' }}>
            {events.map((event, index) => (
              <div key={index} style={{ padding: '8px', borderBottom: '1px solid #eee', fontSize: '12px' }}>
                <strong>{event.eventType}</strong> - {new Date(event.timestamp).toLocaleTimeString()}
                {event.data.guess && <span> - Guess: {event.data.guess}</span>}
                {event.data.isCorrect !== undefined && (
                  <span style={{ color: event.data.isCorrect ? 'green' : 'red' }}>
                    {event.data.isCorrect ? ' ✅' : ' ❌'}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {firebaseData && (
          <div style={{ marginBottom: '20px' }}>
            <h3>🔥 Firebase Analytics</h3>
            <p>Total events in Firebase: {firebaseData.total || 0}</p>
          </div>
        )}

        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={exportData}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            📁 Export Data
          </button>
          <button 
            onClick={() => analytics.clearData()}
            style={{
              padding: '10px 20px',
              backgroundColor: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: 'pointer'
            }}
          >
            🗑️ Clear Data
          </button>
        </div>
      </div>
    </div>
  );
}