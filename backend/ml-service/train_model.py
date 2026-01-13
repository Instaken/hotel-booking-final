"""
Hotel Price Prediction Model Training Script

This script trains a machine learning model to predict hotel prices
based on various features like city, star rating, room type, season, etc.

Usage:
    1. Place your CSV dataset in the same directory as this script
    2. Update DATASET_PATH if needed
    3. Run: python train_model.py
    4. Model files will be saved to ./models/
"""

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import joblib
import os
from datetime import datetime

# Configuration
DATASET_PATH = 'hotel_prices.csv'  # Update this to your dataset path
MODEL_OUTPUT_DIR = './models'
RANDOM_STATE = 42

def load_and_preprocess_data(filepath):
    """Load and preprocess the hotel prices dataset"""
    print(f"Loading dataset from {filepath}...")
    
    df = pd.read_csv(filepath)
    print(f"Dataset shape: {df.shape}")
    print(f"Columns: {df.columns.tolist()}")
    
    # Common column mappings (adjust based on your actual dataset)
    column_mappings = {
        'City': 'city',
        'Hotel_Name': 'hotel_name',
        'Star_Rating': 'star_rating',
        'Stars': 'star_rating',
        'Price': 'price',
        'Room_Type': 'room_type',
        'Date': 'date',
        'Month': 'month',
        'Day': 'day',
        'Day_of_Week': 'day_of_week',
        'Is_Weekend': 'is_weekend',
        'Season': 'season'
    }
    
    # Rename columns if they exist
    for old_name, new_name in column_mappings.items():
        if old_name in df.columns:
            df = df.rename(columns={old_name: new_name})
    
    # Ensure required columns exist
    required_cols = ['city', 'star_rating', 'price']
    for col in required_cols:
        if col not in df.columns:
            raise ValueError(f"Required column '{col}' not found in dataset")
    
    # Handle missing values
    df = df.dropna(subset=['price'])
    
    # Feature engineering
    if 'room_type' not in df.columns:
        df['room_type'] = 'DOUBLE'  # Default
    
    if 'month' not in df.columns and 'date' in df.columns:
        df['month'] = pd.to_datetime(df['date']).dt.month
    elif 'month' not in df.columns:
        df['month'] = 6  # Default to June
    
    if 'day_of_week' not in df.columns and 'date' in df.columns:
        df['day_of_week'] = pd.to_datetime(df['date']).dt.dayofweek
    elif 'day_of_week' not in df.columns:
        df['day_of_week'] = 3  # Default to Wednesday
    
    if 'is_weekend' not in df.columns:
        df['is_weekend'] = df['day_of_week'].apply(lambda x: 1 if x >= 5 else 0)
    
    if 'is_holiday' not in df.columns:
        df['is_holiday'] = 0
    
    if 'season' not in df.columns:
        def get_season(month):
            if month in [12, 1, 2]:
                return 'winter'
            elif month in [3, 4, 5]:
                return 'spring'
            elif month in [6, 7, 8]:
                return 'summer'
            else:
                return 'autumn'
        df['season'] = df['month'].apply(get_season)
    
    # Clean city names
    df['city'] = df['city'].str.lower().str.strip()
    
    # Clean room types
    if df['room_type'].dtype == 'object':
        df['room_type'] = df['room_type'].str.upper().str.strip()
        # Map to standard types
        room_type_mapping = {
            'STANDARD': 'DOUBLE',
            'TWIN': 'DOUBLE',
            'KING': 'DOUBLE',
            'QUEEN': 'DOUBLE',
            'SUPERIOR': 'DELUXE',
            'PREMIUM': 'DELUXE',
            'EXECUTIVE': 'SUITE',
            'JUNIOR SUITE': 'SUITE',
            'PRESIDENTIAL': 'SUITE'
        }
        df['room_type'] = df['room_type'].replace(room_type_mapping)
        # Keep only standard types
        standard_types = ['SINGLE', 'DOUBLE', 'SUITE', 'DELUXE', 'FAMILY']
        df.loc[~df['room_type'].isin(standard_types), 'room_type'] = 'DOUBLE'
    
    # Remove price outliers (optional)
    q1 = df['price'].quantile(0.01)
    q99 = df['price'].quantile(0.99)
    df = df[(df['price'] >= q1) & (df['price'] <= q99)]
    
    print(f"Preprocessed dataset shape: {df.shape}")
    print(f"Price range: {df['price'].min():.2f} - {df['price'].max():.2f}")
    print(f"Cities: {df['city'].nunique()}")
    print(f"Room types: {df['room_type'].unique()}")
    
    return df


def prepare_features(df):
    """Prepare features for training"""
    
    # Define feature columns
    feature_cols = ['city', 'star_rating', 'room_type', 'month', 
                    'day_of_week', 'is_weekend', 'is_holiday', 'season']
    
    # Only use columns that exist
    feature_cols = [col for col in feature_cols if col in df.columns]
    
    X = df[feature_cols].copy()
    y = df['price'].copy()
    
    # Encode categorical variables
    label_encoders = {}
    categorical_cols = ['city', 'room_type', 'season']
    
    for col in categorical_cols:
        if col in X.columns:
            le = LabelEncoder()
            X[col] = le.fit_transform(X[col].astype(str))
            label_encoders[col] = le
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    return X_scaled, y, label_encoders, scaler, feature_cols


def train_model(X_train, y_train, X_test, y_test):
    """Train and evaluate the model"""
    
    print("\nTraining models...")
    
    # Train Random Forest
    rf_model = RandomForestRegressor(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        min_samples_leaf=2,
        random_state=RANDOM_STATE,
        n_jobs=-1
    )
    rf_model.fit(X_train, y_train)
    rf_pred = rf_model.predict(X_test)
    
    # Train Gradient Boosting
    gb_model = GradientBoostingRegressor(
        n_estimators=100,
        max_depth=8,
        learning_rate=0.1,
        random_state=RANDOM_STATE
    )
    gb_model.fit(X_train, y_train)
    gb_pred = gb_model.predict(X_test)
    
    # Evaluate models
    print("\n=== Model Evaluation ===")
    
    print("\nRandom Forest:")
    print(f"  MAE: {mean_absolute_error(y_test, rf_pred):.2f}")
    print(f"  RMSE: {np.sqrt(mean_squared_error(y_test, rf_pred)):.2f}")
    print(f"  R2 Score: {r2_score(y_test, rf_pred):.4f}")
    
    print("\nGradient Boosting:")
    print(f"  MAE: {mean_absolute_error(y_test, gb_pred):.2f}")
    print(f"  RMSE: {np.sqrt(mean_squared_error(y_test, gb_pred)):.2f}")
    print(f"  R2 Score: {r2_score(y_test, gb_pred):.4f}")
    
    # Return best model (comparing R2 scores)
    rf_r2 = r2_score(y_test, rf_pred)
    gb_r2 = r2_score(y_test, gb_pred)
    
    if rf_r2 >= gb_r2:
        print("\n>> Selected model: Random Forest")
        return rf_model, 'random_forest'
    else:
        print("\n>> Selected model: Gradient Boosting")
        return gb_model, 'gradient_boosting'


def save_model(model, label_encoders, scaler, feature_cols, model_type):
    """Save model and preprocessing objects"""
    
    os.makedirs(MODEL_OUTPUT_DIR, exist_ok=True)
    
    joblib.dump(model, f'{MODEL_OUTPUT_DIR}/price_model.pkl')
    joblib.dump(label_encoders, f'{MODEL_OUTPUT_DIR}/label_encoders.pkl')
    joblib.dump(scaler, f'{MODEL_OUTPUT_DIR}/scaler.pkl')
    joblib.dump(feature_cols, f'{MODEL_OUTPUT_DIR}/feature_columns.pkl')
    
    # Save model metadata
    metadata = {
        'model_type': model_type,
        'feature_columns': feature_cols,
        'trained_at': datetime.now().isoformat(),
        'version': '1.0.0'
    }
    joblib.dump(metadata, f'{MODEL_OUTPUT_DIR}/metadata.pkl')
    
    print(f"\nModel saved to {MODEL_OUTPUT_DIR}/")
    print("Files created:")
    print("  - price_model.pkl")
    print("  - label_encoders.pkl")
    print("  - scaler.pkl")
    print("  - feature_columns.pkl")
    print("  - metadata.pkl")


def main():
    """Main training pipeline"""
    print("=" * 50)
    print("Hotel Price Prediction Model Training")
    print("=" * 50)
    
    # Check if dataset exists
    if not os.path.exists(DATASET_PATH):
        print(f"\nError: Dataset not found at {DATASET_PATH}")
        print("Please ensure your CSV file is in the correct location.")
        print("\nExpected CSV format:")
        print("  - city: City name (e.g., 'Paris', 'London')")
        print("  - star_rating: Hotel star rating (1-5)")
        print("  - price: Room price (target variable)")
        print("  - room_type: Optional (SINGLE, DOUBLE, SUITE, DELUXE, FAMILY)")
        print("  - date: Optional (for extracting temporal features)")
        return
    
    # Load and preprocess data
    df = load_and_preprocess_data(DATASET_PATH)
    
    # Prepare features
    X, y, label_encoders, scaler, feature_cols = prepare_features(df)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=RANDOM_STATE
    )
    print(f"\nTraining set: {len(X_train)} samples")
    print(f"Test set: {len(X_test)} samples")
    
    # Train model
    model, model_type = train_model(X_train, y_train, X_test, y_test)
    
    # Save model
    save_model(model, label_encoders, scaler, feature_cols, model_type)
    
    print("\n" + "=" * 50)
    print("Training complete!")
    print("=" * 50)


if __name__ == '__main__':
    main()
