# Firebase Setup Guide for Personal Finance App

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" or "Create a project"
3. Enter project name: `personal-finance-app`
4. Enable Google Analytics (optional)
5. Click "Create Project"

## Step 2: Enable Firebase Authentication

1. In Firebase Console, go to **Build** → **Authentication**
2. Click "Get Started"
3. Enable **Email/Password** sign-in method:
   - Click on "Email/Password"
   - Toggle "Enable"
   - Click "Save"

## Step 3: Create Firestore Database

1. In Firebase Console, go to **Build** → **Firestore Database**
2. Click "Create database"
3. Select "Start in **test mode**" (for development)
4. Choose a location (e.g., `asia-south1` for India)
5. Click "Enable"

## Step 4: Get Firebase Configuration

1. In Firebase Console, click the **Settings** icon (⚙️) → **Project settings**
2. Scroll down to "Your apps" section
3. Click the **Web** icon (`</>`)
4. Register your app with a nickname (e.g., "Finance Web App")
5. Copy the Firebase configuration object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-app.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-app.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

## Step 5: Get Admin SDK Credentials (for Backend)

1. In Firebase Console → **Settings** → **Service accounts**
2. Click "Generate new private key"
3. Save the JSON file as `firebase-credentials.json`
4. Place it in the `config/` folder of this project
5. **IMPORTANT**: Add `firebase-credentials.json` to `.gitignore`

## Step 6: Firestore Security Rules (Optional - Production)

In Firestore Database → Rules, replace with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own data
    match /users/{userId}/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Income data
    match /income/{userId}/records/{recordId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Expenses data
    match /expenses/{userId}/records/{recordId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow other collections similarly...
  }
}
```

## Step 7: Install Required Python Packages

```bash
pip install firebase-admin flask flask-cors python-dotenv
```

## Step 8: Configuration Files

Create a `.env` file in the backend folder:

```env
FIREBASE_CREDENTIALS_PATH=../config/firebase-credentials.json
SECRET_KEY=your-super-secret-key-change-in-production
FLASK_ENV=development
```

## Database Structure

The app will create these Firestore collections:

```
/users/{userId}
  - email: string
  - full_name: string
  - created_at: timestamp
  - profile: {
      age: number
      city: string
      occupation: string
      ...
    }

/income/{userId}/records/{recordId}
  - financial_year: string
  - salary: number
  - bonus: number
  - total_income: number
  - created_at: timestamp

/deductions/{userId}/records/{recordId}
  - financial_year: string
  - section_80c: number
  - section_80d: number
  - total_deductions: number

/expenses/{userId}/records/{recordId}
  - month_year: string
  - rent: number
  - groceries: number
  - total_expenses: number

/savings/{userId}/records/{recordId}
  - month_year: string
  - mutual_funds: number
  - total_savings: number

/liabilities/{userId}/records/{recordId}
  - loan_type: string
  - outstanding_amount: number
  - emi_amount: number

/tax_calculations/{userId}/records/{recordId}
  - financial_year: string
  - old_regime: object
  - new_regime: object
  - calculated_at: timestamp

/health_scores/{userId}/records/{recordId}
  - overall_health_score: number
  - health_category: string
  - calculated_at: timestamp

/stress_predictions/{userId}/records/{recordId}
  - stress_level: string
  - confidence_score: number
  - factors: array
  - predicted_at: timestamp
```

## Notes:

- Firebase automatically creates collections when you add the first document
- No need to manually create collections
- Use subcollections for user-specific data
- Firebase handles indexing automatically
- Real-time sync is built-in
