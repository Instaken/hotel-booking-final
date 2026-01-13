import os
from flask import Flask, request, jsonify
from dotenv import load_dotenv
import joblib
import numpy as np
from datetime import datetime
import logging

load_dotenv()

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load trained model and encoders
MODEL_PATH = os.getenv('MODEL_PATH', '/app/models')

try:
    model = joblib.load(f'{MODEL_PATH}/price_model.pkl')
    label_encoders = joblib.load(f'{MODEL_PATH}/label_encoders.pkl')
    scaler = joblib.load(f'{MODEL_PATH}/scaler.pkl')
    feature_columns = joblib.load(f'{MODEL_PATH}/feature_columns.pkl')
    logger.info('Model and encoders loaded successfully')
except Exception as e:
    logger.warning(f'Could not load model: {e}. Using fallback predictions.')
    model = None
    label_encoders = None
    scaler = None
    feature_columns = None


def is_weekend(date_str):
    """Check if date is weekend"""
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d')
        return date.weekday() >= 5
    except:
        return False


def get_month(date_str):
    """Extract month from date"""
    try:
        date = datetime.strptime(date_str, '%Y-%m-%d')
        return date.month
    except:
        return 1


def get_season(month):
    """Get season from month"""
    if month in [12, 1, 2]:
        return 'winter'
    elif month in [3, 4, 5]:
        return 'spring'
    elif month in [6, 7, 8]:
        return 'summer'
    else:
        return 'autumn'


def fallback_prediction(city, star_rating, room_type, date, weekend=False, holiday=False):
    """Fallback price prediction when model is not available"""
    base_prices = {
        'SINGLE': 60,
        'DOUBLE': 90,
        'SUITE': 180,
        'DELUXE': 150,
        'FAMILY': 130
    }
    
    base = base_prices.get(room_type, 100)
    
    # Star rating multiplier
    star_multiplier = 1 + (star_rating - 3) * 0.25
    
    # Weekend/holiday premium
    if weekend:
        base *= 1.15
    if holiday:
        base *= 1.25
    
    # Seasonal adjustment
    month = get_month(date)
    if month in [6, 7, 8]:  # Summer
        base *= 1.20
    elif month in [12]:  # December
        base *= 1.30
    
    # City premium (simplified)
    premium_cities = ['paris', 'london', 'rome', 'barcelona', 'amsterdam']
    if city.lower() in premium_cities:
        base *= 1.25
    
    predicted_price = base * star_multiplier
    
    return {
        'predicted_price': round(predicted_price, 2),
        'confidence': 0.65,
        'factors': {
            'base_room_price': base_prices.get(room_type, 100),
            'star_rating_multiplier': star_multiplier,
            'weekend_premium': weekend,
            'holiday_premium': holiday,
            'seasonal_adjustment': get_season(month),
            'note': 'Fallback prediction - ML model not loaded'
        }
    }


def ml_prediction(city, star_rating, room_type, date, weekend=False, holiday=False):
    """ML-based price prediction"""
    try:
        month = get_month(date)
        season = get_season(month)
        day_of_week = datetime.strptime(date, '%Y-%m-%d').weekday()
        
        # Prepare features
        features = {
            'city': city.lower(),
            'star_rating': star_rating,
            'room_type': room_type,
            'month': month,
            'day_of_week': day_of_week,
            'is_weekend': 1 if weekend else 0,
            'is_holiday': 1 if holiday else 0,
            'season': season
        }
        
        # Encode categorical features
        feature_array = []
        for col in feature_columns:
            if col in label_encoders:
                try:
                    encoded = label_encoders[col].transform([features.get(col, 'unknown')])[0]
                except:
                    encoded = 0
                feature_array.append(encoded)
            else:
                feature_array.append(features.get(col, 0))
        
        # Scale features
        feature_array = np.array(feature_array).reshape(1, -1)
        feature_array_scaled = scaler.transform(feature_array)
        
        # Predict
        predicted_price = model.predict(feature_array_scaled)[0]
        
        return {
            'predicted_price': round(float(predicted_price), 2),
            'confidence': 0.85,
            'factors': {
                'city': city,
                'star_rating': star_rating,
                'room_type': room_type,
                'month': month,
                'season': season,
                'is_weekend': weekend,
                'is_holiday': holiday
            }
        }
    except Exception as e:
        logger.error(f'ML prediction error: {e}')
        return fallback_prediction(city, star_rating, room_type, date, weekend, holiday)


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'ml-service',
        'model_loaded': model is not None
    })


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        
        city = data.get('city', 'unknown')
        star_rating = int(data.get('star_rating', 3))
        room_type = data.get('room_type', 'DOUBLE')
        date = data.get('date', datetime.now().strftime('%Y-%m-%d'))
        weekend = data.get('weekend', is_weekend(date))
        holiday = data.get('holiday', False)
        
        if model is not None:
            result = ml_prediction(city, star_rating, room_type, date, weekend, holiday)
        else:
            result = fallback_prediction(city, star_rating, room_type, date, weekend, holiday)
        
        return jsonify(result)
    
    except Exception as e:
        logger.error(f'Prediction error: {e}')
        return jsonify({
            'error': str(e),
            'predicted_price': 100.0,
            'confidence': 0.0
        }), 500


@app.route('/batch-predict', methods=['POST'])
def batch_predict():
    try:
        data = request.get_json()
        predictions_input = data.get('predictions', [])
        
        results = []
        for item in predictions_input:
            city = item.get('city', 'unknown')
            star_rating = int(item.get('star_rating', 3))
            room_type = item.get('room_type', 'DOUBLE')
            date = item.get('date', datetime.now().strftime('%Y-%m-%d'))
            weekend = item.get('weekend', is_weekend(date))
            holiday = item.get('holiday', False)
            
            if model is not None:
                result = ml_prediction(city, star_rating, room_type, date, weekend, holiday)
            else:
                result = fallback_prediction(city, star_rating, room_type, date, weekend, holiday)
            
            result['input'] = item
            results.append(result)
        
        return jsonify({'predictions': results})
    
    except Exception as e:
        logger.error(f'Batch prediction error: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/model-info', methods=['GET'])
def model_info():
    return jsonify({
        'model_loaded': model is not None,
        'features': feature_columns if feature_columns else [],
        'supported_room_types': ['SINGLE', 'DOUBLE', 'SUITE', 'DELUXE', 'FAMILY'],
        'version': '1.0.0'
    })


if __name__ == '__main__':
    port = int(os.getenv('PORT', 8080))
    app.run(host='0.0.0.0', port=port, debug=False)
