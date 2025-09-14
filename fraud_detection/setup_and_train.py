"""
One-time setup script to generate data and train models
Run this once to set up your fraud detection system
"""

from data_generator import NigerianVotingDataGenerator
from fraud_detector import BlockchainVotingFraudDetector
import os

def setup_fraud_detection_system():
    """Complete setup of fraud detection system"""
    
    print("🇳🇬 BLOCKCHAIN VOTING FRAUD DETECTION SETUP")
    print("=" * 60)
    print("This will generate training data and train AI models.")
    print("This only needs to be run once!\n")
    
    # Step 1: Generate Nigerian voting data
    print("Step 1: Generating Nigerian voting dataset...")
    generator = NigerianVotingDataGenerator()
    
    votes_df, candidates, locations, voters_df = generator.generate_complete_dataset(
        num_voters=50000,   # 50,000 registered voters
        num_votes=40000,    # 40,000 actual votes (80% turnout)
        fraud_rate=0.06     # 6% fraud rate (realistic for detection training)
    )
    
    # Save the dataset
    data_dir = generator.save_dataset(votes_df, candidates, locations, voters_df)
    
    print(f"\n✅ Dataset generated and saved to '{data_dir}'")
    
    # Step 2: Train fraud detection models
    print("\nStep 2: Training fraud detection models...")
    detector = BlockchainVotingFraudDetector()
    detector.train_models(votes_df)
    
    print(f"\n✅ Models trained and saved to 'fraud_detection_models'")
    
    # Step 3: Test the system
    print("\nStep 3: Testing fraud detection...")
    
    # Test with a normal vote
    test_vote_normal = {
        'vote_id': 'TEST001',
        'voter_id': 'NG12345678',
        'candidate_id': 1,
        'location_id': 15,
        'timestamp': '2024-11-16 14:30:00',
        'voting_method': 'electronic',
        'ip_address': '192.168.1.45',
        'session_duration': 120,
        'device_fingerprint': 'abc123def456'
    }
    
    result_normal = detector.predict_fraud_realtime(test_vote_normal)
    print(f"Normal vote test - Fraud probability: {result_normal['fraud_probability']:.3f}")
    
    # Test with a suspicious vote
    test_vote_fraud = {
        'vote_id': 'TEST002',
        'voter_id': 'NG12345678',  # Same voter as before!
        'candidate_id': 2,
        'location_id': 15,
        'timestamp': '2024-11-16 14:32:00',  # 2 minutes later
        'voting_method': 'electronic',
        'ip_address': '192.168.1.45',  # Same IP
        'session_duration': 5,  # Very fast
        'device_fingerprint': 'abc123def456'
    }
    
    result_fraud = detector.predict_fraud_realtime(test_vote_fraud)
    print(f"Suspicious vote test - Fraud probability: {result_fraud['fraud_probability']:.3f}")
    print(f"Fraud indicators: {result_fraud['fraud_indicators']}")
    
    print(f"\n🎉 FRAUD DETECTION SYSTEM SETUP COMPLETE!")
    print(f"📁 Files created:")
    print(f"   - {data_dir}/nigerian_votes_dataset.csv")
    print(f"   - {data_dir}/dataset_metadata.json")
    print(f"   - fraud_detection_models/random_forest_model.joblib")
    print(f"   - fraud_detection_models/isolation_forest_model.joblib")
    print(f"\n🚀 Ready to integrate with your blockchain voting system!")

if __name__ == "__main__":
    setup_fraud_detection_system()