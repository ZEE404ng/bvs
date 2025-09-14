import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
import joblib
import os
from datetime import datetime, timedelta
from typing import Dict, List, Tuple, Optional
import warnings
warnings.filterwarnings('ignore')

class BlockchainVotingFraudDetector:
    """Advanced fraud detection for blockchain voting systems"""
    
    def __init__(self, model_save_dir="fraud_detection_models"):
        self.model_save_dir = model_save_dir
        self.models = {}
        self.scalers = {}
        self.encoders = {}
        self.feature_columns = []
        self.is_trained = False
        
        os.makedirs(model_save_dir, exist_ok=True)
    
    def prepare_features(self, votes_df: pd.DataFrame) -> pd.DataFrame:
        """Engineer features for fraud detection"""
        print("🔧 Engineering fraud detection features...")
        
        df = votes_df.copy()
        
        # Convert timestamp to datetime if it's string
        if df['timestamp'].dtype == 'object':
            df['timestamp'] = pd.to_datetime(df['timestamp'])
        
        # Time-based features
        df['hour'] = df['timestamp'].dt.hour
        df['day_of_week'] = df['timestamp'].dt.dayofweek
        df['minute'] = df['timestamp'].dt.minute
        df['is_weekend'] = df['day_of_week'].isin([5, 6]).astype(int)
        
        # Voting pattern aggregations
        df['votes_same_ip'] = df.groupby('ip_address')['vote_id'].transform('count')
        df['votes_same_location'] = df.groupby('location_id')['vote_id'].transform('count')
        df['votes_same_device'] = df.groupby('device_fingerprint')['vote_id'].transform('count')
        df['votes_same_voter'] = df.groupby('voter_id')['vote_id'].transform('count')
        
        # Time-based patterns
        df_sorted = df.sort_values(['location_id', 'timestamp'])
        df_sorted['time_diff_prev'] = df_sorted.groupby('location_id')['timestamp'].diff().dt.total_seconds()
        df_sorted['time_diff_prev'] = df_sorted['time_diff_prev'].fillna(300)
        
        # Session characteristics
        df_sorted['session_z_score'] = np.abs(
            (df_sorted['session_duration'] - df_sorted['session_duration'].mean()) / 
            (df_sorted['session_duration'].std() + 1e-6)
        )
        
        # Location-based features
        location_stats = df.groupby('location_id').agg({
            'vote_id': 'count',
            'timestamp': ['min', 'max'],
            'session_duration': 'mean'
        }).round(2)
        
        location_stats.columns = ['location_total_votes', 'location_first_vote', 
                                'location_last_vote', 'location_avg_session']
        
        df_sorted = df_sorted.merge(
            location_stats, left_on='location_id', right_index=True, how='left'
        )
        
        # Voting rush indicators
        df_sorted['votes_same_hour_location'] = df_sorted.groupby(['location_id', 'hour'])['vote_id'].transform('count')
        df_sorted['location_utilization_rate'] = df_sorted['location_total_votes'] / 1000  # Assume 1000 max capacity
        
        # Candidate preference anomalies
        candidate_popularity = df['candidate_id'].value_counts()
        df_sorted['candidate_popularity'] = df_sorted['candidate_id'].map(candidate_popularity)
        df_sorted['voting_against_trend'] = (df_sorted['candidate_popularity'] < candidate_popularity.mean()).astype(int)
        
        # Network-based features
        ip_voting_pattern = df.groupby('ip_address')['candidate_id'].agg(['count', 'nunique'])
        ip_voting_pattern.columns = ['ip_vote_count', 'ip_candidate_variety']
        df_sorted = df_sorted.merge(ip_voting_pattern, left_on='ip_address', right_index=True, how='left')
        
        # Encode categorical variables
        categorical_cols = ['voting_method']
        
        for col in categorical_cols:
            if col in df_sorted.columns:
                if col not in self.encoders:
                    self.encoders[col] = LabelEncoder()
                    df_sorted[f'{col}_encoded'] = self.encoders[col].fit_transform(df_sorted[col].astype(str))
                else:
                    df_sorted[f'{col}_encoded'] = self.encoders[col].transform(df_sorted[col].astype(str))
        
        # Define feature columns
        self.feature_columns = [
            'hour', 'day_of_week', 'minute', 'is_weekend',
            'session_duration', 'session_z_score', 'time_diff_prev',
            'votes_same_ip', 'votes_same_location', 'votes_same_device', 'votes_same_voter',
            'votes_same_hour_location', 'location_utilization_rate',
            'candidate_popularity', 'voting_against_trend',
            'ip_vote_count', 'ip_candidate_variety',
            'location_total_votes', 'location_avg_session'
        ]
        
        # Add encoded categorical features
        for col in categorical_cols:
            if f'{col}_encoded' in df_sorted.columns:
                self.feature_columns.append(f'{col}_encoded')
        
        # Fill missing values
        feature_df = df_sorted[self.feature_columns + ['is_fraud'] if 'is_fraud' in df_sorted.columns else self.feature_columns]
        feature_df = feature_df.fillna(0)
        
        print(f"✅ Created {len(self.feature_columns)} features for {len(feature_df)} votes")
        
        return feature_df
    
    def train_models(self, votes_df: pd.DataFrame):
        """Train fraud detection models"""
        print("🤖 Training blockchain voting fraud detection models...")
        print("=" * 60)
        
        # Prepare features
        feature_df = self.prepare_features(votes_df)
        
        if 'is_fraud' not in feature_df.columns:
            raise ValueError("Training data must contain 'is_fraud' column")
        
        X = feature_df[self.feature_columns]
        y = feature_df['is_fraud']
        
        print(f"📊 Training data: {len(X)} votes, {y.sum()} fraudulent ({y.mean()*100:.1f}%)")
        
        # Scale features
        print("📏 Scaling features...")
        self.scalers['standard'] = StandardScaler()
        X_scaled = self.scalers['standard'].fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Train Isolation Forest (Anomaly Detection)
        print("🌲 Training Isolation Forest...")
        self.models['isolation_forest'] = IsolationForest(
            contamination=y.mean() + 0.01,  # Slightly higher than actual fraud rate
            random_state=42,
            n_estimators=200,
            max_features=0.8
        )
        # Train only on normal votes
        self.models['isolation_forest'].fit(X_train[y_train == 0])
        
        # Train Random Forest Classifier
        print("🎯 Training Random Forest Classifier...")
        self.models['random_forest'] = RandomForestClassifier(
            n_estimators=200,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight='balanced'
        )
        self.models['random_forest'].fit(X_train, y_train)
        
        # Evaluate models
        self._evaluate_models(X_test, y_test)
        
        # Save models
        self._save_models()
        
        self.is_trained = True
        print("✅ Training complete! Models saved.")
    
    def _evaluate_models(self, X_test, y_test):
        """Evaluate model performance"""
        print("\n📈 Model Performance Evaluation:")
        print("=" * 50)
        
        # Isolation Forest
        iso_pred = self.models['isolation_forest'].predict(X_test)
        iso_pred_binary = np.where(iso_pred == -1, 1, 0)
        
        print("🔍 Isolation Forest Results:")
        print(classification_report(y_test, iso_pred_binary, zero_division=0))
        
        if len(np.unique(y_test)) > 1:
            iso_auc = roc_auc_score(y_test, iso_pred_binary)
            print(f"AUC Score: {iso_auc:.3f}")
        
        # Random Forest
        rf_pred = self.models['random_forest'].predict(X_test)
        rf_pred_proba = self.models['random_forest'].predict_proba(X_test)[:, 1]
        
        print("\n🎯 Random Forest Results:")
        print(classification_report(y_test, rf_pred, zero_division=0))
        
        if len(np.unique(y_test)) > 1:
            rf_auc = roc_auc_score(y_test, rf_pred_proba)
            print(f"AUC Score: {rf_auc:.3f}")
        
        # Feature Importance
        feature_importance = pd.DataFrame({
            'feature': self.feature_columns,
            'importance': self.models['random_forest'].feature_importances_
        }).sort_values('importance', ascending=False)
        
        print(f"\n🎯 Top 10 Fraud Detection Features:")
        print(feature_importance.head(10).to_string(index=False))
    
    def _save_models(self):
        """Save trained models and preprocessors"""
        model_files = {
            'isolation_forest': 'isolation_forest_model.joblib',
            'random_forest': 'random_forest_model.joblib'
        }
        
        # Save models
        for model_name, filename in model_files.items():
            joblib.dump(self.models[model_name], 
                       os.path.join(self.model_save_dir, filename))
        
        # Save scalers and encoders
        joblib.dump(self.scalers, os.path.join(self.model_save_dir, 'scalers.joblib'))
        joblib.dump(self.encoders, os.path.join(self.model_save_dir, 'encoders.joblib'))
        
        # Save feature columns and metadata
        metadata = {
            'feature_columns': self.feature_columns,
            'training_date': datetime.now().isoformat(),
            'model_version': '1.0'
        }
        
        import json
        with open(os.path.join(self.model_save_dir, 'model_metadata.json'), 'w') as f:
            json.dump(metadata, f, indent=2)
    
    def load_models(self):
        """Load pre-trained models"""
        try:
            print("📂 Loading pre-trained fraud detection models...")
            
            # Load models
            self.models['isolation_forest'] = joblib.load(
                os.path.join(self.model_save_dir, 'isolation_forest_model.joblib')
            )
            self.models['random_forest'] = joblib.load(
                os.path.join(self.model_save_dir, 'random_forest_model.joblib')
            )
            
            # Load scalers and encoders
            self.scalers = joblib.load(os.path.join(self.model_save_dir, 'scalers.joblib'))
            self.encoders = joblib.load(os.path.join(self.model_save_dir, 'encoders.joblib'))
            
            # Load metadata
            import json
            with open(os.path.join(self.model_save_dir, 'model_metadata.json'), 'r') as f:
                metadata = json.load(f)
                self.feature_columns = metadata['feature_columns']
            
            self.is_trained = True
            print("✅ Models loaded successfully!")
            
        except FileNotFoundError as e:
            print(f"❌ Model files not found: {e}")
            print("Please train models first using train_models()")
            return False
        
        return True
    
    def predict_fraud_realtime(self, vote_data: Dict) -> Dict:
        """Predict fraud for a single vote in real-time"""
        if not self.is_trained:
            if not self.load_models():
                raise ValueError("No trained models available")
        
        # Convert single vote to DataFrame
        vote_df = pd.DataFrame([vote_data])
        
        # Prepare features (this will use cached encoders/scalers)
        try:
            feature_df = self.prepare_features(vote_df)
            X = feature_df[self.feature_columns].fillna(0)
            X_scaled = self.scalers['standard'].transform(X)
        except Exception as e:
            # Fallback for new data that might have encoding issues
            print(f"⚠️ Feature preparation warning: {e}")
            return {
                'vote_id': vote_data.get('vote_id', 'unknown'),
                'is_fraud': False,
                'fraud_probability': 0.0,
                'confidence': 'low',
                'fraud_indicators': [],
                'error': str(e)
            }
        
        # Get predictions
        iso_pred = self.models['isolation_forest'].predict(X_scaled)[0]
        rf_pred_proba = self.models['random_forest'].predict_proba(X_scaled)[0][1]
        rf_pred = self.models['random_forest'].predict(X_scaled)[0]
        
        # Combine predictions
        iso_fraud = 1 if iso_pred == -1 else 0
        ensemble_score = (iso_fraud + rf_pred_proba) / 2
        is_fraud = ensemble_score > 0.5
        
        # Determine confidence level
        if ensemble_score > 0.8:
            confidence = 'high'
        elif ensemble_score > 0.6:
            confidence = 'medium'
        else:
            confidence = 'low'
        
        # Identify fraud indicators
        fraud_indicators = self._identify_fraud_indicators(vote_data, feature_df.iloc[0])
        
        return {
            'vote_id': vote_data.get('vote_id', 'unknown'),
            'is_fraud': is_fraud,
            'fraud_probability': float(ensemble_score),
            'confidence': confidence,
            'isolation_score': float(iso_fraud),
            'rf_probability': float(rf_pred_proba),
            'fraud_indicators': fraud_indicators,
            'timestamp': datetime.now().isoformat()
        }
    
    def _identify_fraud_indicators(self, vote_data: Dict, features: pd.Series) -> List[str]:
        """Identify specific fraud indicators for explainable AI"""
        indicators = []
        
        # Check for multiple voting
        if features.get('votes_same_voter', 0) > 1:
            indicators.append(f"Multiple votes from same voter ({features['votes_same_voter']})")
        
        # Check for IP clustering
        if features.get('votes_same_ip', 0) > 5:
            indicators.append(f"High IP clustering ({features['votes_same_ip']} votes)")
        
        # Check for unusual timing
        hour = features.get('hour', 12)
        if hour < 6 or hour > 20:
            indicators.append(f"Unusual voting time ({hour}:00)")
        
        # Check for rapid voting
        if features.get('session_duration', 120) < 30:
            indicators.append(f"Unusually fast voting ({features['session_duration']}s)")
        
        # Check for location stuffing
        if features.get('location_utilization_rate', 0) > 0.8:
            indicators.append("Location over-capacity")
        
        # Check for device anomalies
        if features.get('votes_same_device', 0) > 3:
            indicators.append(f"Multiple votes from same device ({features['votes_same_device']})")
        
        return indicators