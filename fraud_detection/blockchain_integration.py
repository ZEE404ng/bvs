"""
Integration module to connect fraud detection with your blockchain voting system
"""

import asyncio
import json
from datetime import datetime
from typing import Dict, Optional
from fraud_detector import BlockchainVotingFraudDetector
import requests

class BlockchainFraudIntegration:
    """Integration layer between blockchain voting and fraud detection"""
    
    def __init__(self, fraud_api_url="http://127.0.0.1:8001"):
        self.fraud_detector = BlockchainVotingFraudDetector()
        self.fraud_api_url = fraud_api_url
        self.alert_callbacks = []
        
        # Load models
        self.fraud_detector.load_models()
    
    def add_alert_callback(self, callback):
        """Add callback function to handle fraud alerts"""
        self.alert_callbacks.append(callback)
    
    async def analyze_blockchain_vote(self, vote_data: Dict) -> Dict:
        """
        Analyze a vote from the blockchain for fraud
        
        Expected vote_data format:
        {
            'vote_id': 'string',
            'voter_id': 'string', 
            'candidate_id': int,
            'location_id': int,
            'timestamp': datetime or string,
            'transaction_hash': 'string',
            'ip_address': 'string',
            'session_duration': int,
            'device_fingerprint': 'string'
        }
        """
        try:
            # Ensure timestamp is string for API
            if isinstance(vote_data.get('timestamp'), datetime):
                vote_data['timestamp'] = vote_data['timestamp'].isoformat()
            
            # Add default values if missing
            vote_data.setdefault('voting_method', 'electronic')
            vote_data.setdefault('session_duration', 120)
            vote_data.setdefault('device_fingerprint', 'unknown')
            
            # Analyze for fraud
            fraud_result = self.fraud_detector.predict_fraud_realtime(vote_data)
            
            # If fraud detected, trigger alerts
            if fraud_result['is_fraud']:
                await self._handle_fraud_detection(fraud_result)
            
            return fraud_result
            
        except Exception as e:
            print(f"❌ Fraud analysis error: {str(e)}")
            return {
                'vote_id': vote_data.get('vote_id', 'unknown'),
                'is_fraud': False,
                'fraud_probability': 0.0,
                'error': str(e)
            }
    
    async def _handle_fraud_detection(self, fraud_result: Dict):
        """Handle fraud detection - send alerts"""
        print(f"🚨 FRAUD DETECTED: Vote {fraud_result['vote_id']}")
        print(f"   Probability: {fraud_result['fraud_probability']:.1%}")
        print(f"   Indicators: {', '.join(fraud_result['fraud_indicators'])}")
        
        # Call registered callbacks
        for callback in self.alert_callbacks:
            try:
                await callback(fraud_result)
            except Exception as e:
                print(f"❌ Alert callback error: {e}")
    
    def get_fraud_statistics(self) -> Dict:
        """Get fraud detection statistics"""
        try:
            response = requests.get(f"{self.fraud_api_url}/stats", timeout=5)
            if response.status_code == 200:
                return response.json()
        except:
            pass
        
        return {
            "error": "Could not connect to fraud detection API",
            "model_loaded": self.fraud_detector.is_trained
        }
