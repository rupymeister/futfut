# Firebase Football Backend

This project is a Firebase backend for a football player guessing game application. It provides a set of Cloud Functions to handle CRUD operations for players, games, and analytics.

## Project Structure

- **functions/**: Contains the Firebase Cloud Functions code.
  - **src/**: Source code for the functions.
    - **index.ts**: Entry point for the Firebase Cloud Functions.
    - **controllers/**: Contains controllers for handling requests.
      - **players.ts**: CRUD operations for players.
      - **games.ts**: CRUD operations for games.
      - **analytics.ts**: Functions for handling analytics.
    - **models/**: Defines data models.
      - **Player.ts**: Player data model.
      - **Game.ts**: Game data model.
      - **GameSession.ts**: Game session data model.
    - **services/**: Contains business logic for operations.
      - **playerService.ts**: Logic for player operations.
      - **gameService.ts**: Logic for game operations.
      - **analyticsService.ts**: Logic for analytics operations.
    - **utils/**: Utility functions.
      - **validation.ts**: Input validation functions.
      - **helpers.ts**: General helper functions.
    - **types/**: TypeScript types and interfaces.
      - **index.ts**: Exports types used throughout the application.
  - **package.json**: NPM configuration file for dependencies and scripts.
  - **tsconfig.json**: TypeScript configuration file.

- **firestore.rules**: Security rules for Firestore.
- **firebase.json**: Firebase configuration file.

## Setup Instructions

1. **Clone the repository**:
   ```
   git clone <repository-url>
   cd firebase-football-backend
   ```

2. **Install dependencies**:
   Navigate to the `functions` directory and run:
   ```
   npm install
   ```

3. **Deploy to Firebase**:
   Make sure you have the Firebase CLI installed and authenticated. Then run:
   ```
   firebase deploy
   ```

## Usage

- The backend provides endpoints for managing players and games, as well as tracking analytics.
- Refer to the individual controller files for specific endpoint details and usage instructions.

## License

This project is licensed under the MIT License.