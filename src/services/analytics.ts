export interface GameEvent {
  id: string;
  playerId?: string;
  sessionId: string;
  timestamp: Date;
  eventType: 'guess_made' | 'guess_result' | 'game_end';
  data: {
    question?: {
      rowFeature: string;
      rowFeatureType: string;
      colFeature: string;
      colFeatureType: string;
      correctAnswers: string[];
    };
    guess?: string;
    isCorrect?: boolean;
    cellPosition?: [number, number];
    gameMode?: 'single' | 'multiplayer';
    score?: number;
    gridInfo?: {
      totalCells: number;
      validCells: number;
      answeredCells: number;
    };
  };
}


export class AnalyticsService {
  private sessionId: string;
  private events: GameEvent[] = [];
  private playerId?: string;
  private baseUrl: string;

  constructor() {
    this.sessionId = this.generateSessionId();
    // Updated with your working Firebase endpoint
    this.baseUrl = process.env.NODE_ENV === 'production' 
      ? 'https://us-central1-futfut-6a19f.cloudfunctions.net/api'
      : 'http://localhost:5001/futfut-6a19f/us-central1/api';
    this.loadStoredEvents();
    
    // Test connection on startup
    this.testConnection();
  }

  private async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/health`);
      const data = await response.json();
      console.log('✅ Firebase connection established:', data);
    } catch (error) {
      console.warn('⚠️  Firebase connection failed, using local storage only:', error);
    }
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  setPlayerId(id: string) {
    this.playerId = id;
  }
  getSessionId(): string {
    return this.sessionId;
  }

  async trackEvent(eventType: GameEvent['eventType'], data: GameEvent['data']) {
    const event: GameEvent = {
      id: this.generateEventId(),
      playerId: this.playerId,
      sessionId: this.sessionId,
      timestamp: new Date(),
      eventType,
      data
    };

    // Store locally first
    this.events.push(event);
    this.saveToStorage();
    
    // Log to console for debugging
    console.log('📊 Analytics Event:', eventType, data);
    
    // Send to Firebase backend
    try {
      await this.sendToFirebase(event);
      console.log('✅ Event sent to Firebase');
    } catch (error) {
      console.warn('⚠️  Failed to send analytics to Firebase:', error);
    }
  }

  private async sendToFirebase(event: GameEvent) {
    try {
      const response = await fetch(`${this.baseUrl}/analytics/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(event)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Firebase analytics error:', error);
      throw error;
    }
  }

  async fetchAnalyticsFromFirebase(filters = {}) {
    try {
      const queryParams = new URLSearchParams(filters);
      const response = await fetch(`${this.baseUrl}/analytics?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to fetch analytics from Firebase:', error);
      return null;
    }
  }

  private saveToStorage() {
    try {
      localStorage.setItem('game_analytics', JSON.stringify(this.events));
    } catch (error) {
      console.warn('Failed to save analytics to localStorage:', error);
    }
  }

  private loadStoredEvents() {
    try {
      const stored = localStorage.getItem('game_analytics');
      if (stored) {
        this.events = JSON.parse(stored).map((event: any) => ({
          ...event,
          timestamp: new Date(event.timestamp)
        }));
        console.log(`📈 Loaded ${this.events.length} stored analytics events`);
      }
    } catch (error) {
      console.warn('Failed to load analytics from localStorage:', error);
      this.events = [];
    }
  }

  getEvents(): GameEvent[] {
    return [...this.events];
  }

  getEventsByType(eventType: GameEvent['eventType']): GameEvent[] {
    return this.events.filter(event => event.eventType === eventType);
  }

  getSessionEvents(sessionId?: string): GameEvent[] {
    const targetSessionId = sessionId || this.sessionId;
    return this.events.filter(event => event.sessionId === targetSessionId);
  }

  exportData(): string {
    return JSON.stringify(this.events, null, 2);
  }

  clearData() {
    this.events = [];
    localStorage.removeItem('game_analytics');
  }

  getGameStats() {
    const events = this.getEvents();
    const guessResults = events.filter(e => e.eventType === 'guess_result');
    const correctGuesses = guessResults.filter(e => e.data.isCorrect);
    const guessesMade = events.filter(e => e.eventType === 'guess_made');
    const gamesEnded = events.filter(e => e.eventType === 'game_end');

    return {
      totalGuesses: guessesMade.length,
      totalResults: guessResults.length,
      correctGuesses: correctGuesses.length,
      incorrectGuesses: guessResults.length - correctGuesses.length,
      accuracy: guessResults.length > 0 ? (correctGuesses.length / guessResults.length) * 100 : 0,
      gamesCompleted: gamesEnded.length,
      currentSession: this.sessionId
    };
  }
}

export const analytics = new AnalyticsService();