#!/usr/bin/env python3
"""
Startup script for fraud detection system
Run this along with your blockchain voting system
"""

import subprocess
import sys
import os
import time

def check_models_exist():
    """Check if fraud detection models are trained"""
    model_files = [
        'fraud_detection_models/random_forest_model.joblib',
        'fraud_detection_models/isolation_forest_model.joblib',
        'fraud_detection_models/model_metadata.json'
    ]
    
    missing_files = [f for f in model_files if not os.path.exists(f)]
    
    if missing_files:
        print("❌ Fraud detection models not found!")
        print("Missing files:")
        for f in missing_files:
            print(f"   - {f}")
        print("\n🔧 Please run the setup first:")
        print("   cd fraud_detection")
        print("   python setup_and_train.py")
        return False
    
    return True

def start_fraud_detection_api():
    """Start the fraud detection API server"""
    if not check_models_exist():
        return False
    
    print("🚀 Starting Fraud Detection API...")
    
    # Change to fraud_detection directory
    os.chdir('fraud_detection')
    
    try:
        # Start the API server
        subprocess.run([
            sys.executable, 'realtime_api.py'
        ])
        
    except KeyboardInterrupt:
        print("\n🛑 Fraud Detection API stopped by user")
        return True
    except Exception as e:
        print(f"❌ Error starting fraud detection API: {e}")
        return False

if __name__ == "__main__":
    print("🛡️ Blockchain Voting System - Fraud Detection")
    print("=" * 50)
    
    if start_fraud_detection_api():
        print("✅ Fraud Detection API started successfully!")
    else:
        print("❌ Failed to start Fraud Detection API")
        sys.exit(1)