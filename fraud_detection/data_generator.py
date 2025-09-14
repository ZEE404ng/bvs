import pandas as pd
import numpy as np
from faker import Faker
import random
from datetime import datetime, timedelta
import json
import os
import uuid
import hashlib
from typing import Dict, List, Tuple

class NigerianVotingDataGenerator:
    """Generate realistic Nigerian voting data with fraud patterns"""
    
    def __init__(self, seed=42):
        self.fake = Faker(['en_US'])  # Nigerian and English locales
        Faker.seed(seed)
        random.seed(seed)
        np.random.seed(seed)
        
        # Nigerian-specific data
        self.nigerian_states = [
            'Lagos', 'Kano', 'Rivers', 'Oyo', 'Kaduna', 'Anambra', 'Delta', 'Plateau',
            'Edo', 'Ondo', 'Enugu', 'Kwara', 'Cross River', 'Akwa Ibom', 'Osun'
        ]
        
        self.parties = [
            'All Progressives Congress (APC)',
            'Peoples Democratic Party (PDP)', 
            'Labour Party (LP)',
            'New Nigeria Peoples Party (NNPP)',
            'African Democratic Congress (ADC)'
        ]
        
        self.voting_locations = [
            'Primary School', 'Secondary School', 'Town Hall', 'Community Center',
            'Local Government Secretariat', 'Church Hall', 'Mosque', 'Market Square'
        ]
        
    def generate_complete_dataset(self, num_voters=50000, num_votes=40000, fraud_rate=0.05):
        """Generate complete Nigerian voting dataset with fraud patterns"""
        
        print("🇳🇬 Generating Nigerian Blockchain Voting Dataset...")
        print("=" * 60)
        
        # Step 1: Generate candidates (using your existing names)
        candidates = [
            {'id': 1, 'name': 'Ugbonna Prince', 'party': 'All Progressives Congress (APC)'},
            {'id': 2, 'name': 'Zainab Abdulwahab', 'party': 'Peoples Democratic Party (PDP)'},
            {'id': 3, 'name': 'Basit Adetunde', 'party': 'Labour Party (LP)'},
            {'id': 4, 'name': 'Ngbede Comfort', 'party': 'New Nigeria Peoples Party (NNPP)'},
            {'id': 5, 'name': 'Adebayo Olumide', 'party': 'African Democratic Congress (ADC)'}
        ]
        
        print(f"✅ Generated {len(candidates)} candidates")
        
        # Step 2: Generate voting locations
        locations = self._generate_locations(100)
        print(f"✅ Generated {len(locations)} voting locations")
        
        # Step 3: Generate voter profiles
        voters_df = self._generate_voters(num_voters)
        print(f"✅ Generated {num_voters:,} voter profiles")
        
        # Step 4: Generate votes with fraud patterns
        votes_df = self._generate_votes_with_fraud(
            voters_df, candidates, locations, num_votes, fraud_rate
        )
        print(f"✅ Generated {num_votes:,} votes")
        print(f"🚨 Injected {votes_df['is_fraud'].sum():,} fraudulent votes ({fraud_rate*100:.1f}%)")
        
        return votes_df, candidates, locations, voters_df
    
    def _generate_locations(self, num_locations):
        """Generate Nigerian voting locations"""
        locations = []
        
        for i in range(num_locations):
            state = random.choice(self.nigerian_states)
            location_type = random.choice(self.voting_locations)
            
            location = {
                'location_id': i + 1,
                'name': f"{location_type} - {state} {i+1:03d}",
                'state': state,
                'lga': f"{state} LGA {random.randint(1, 20)}",
                'ward': f"Ward {random.randint(1, 15)}",
                'registered_voters': random.randint(300, 2000),
                'location_type': location_type.lower().replace(' ', '_'),
                'latitude': random.uniform(4.0, 14.0),  # Nigeria's lat range
                'longitude': random.uniform(3.0, 15.0),  # Nigeria's long range
            }
            locations.append(location)
            
        return locations
    
    def _generate_voters(self, num_voters):
        """Generate Nigerian voter profiles"""
        voters = []
        
        for i in range(num_voters):
            # Generate Nigerian names using Faker
            first_name = self.fake.first_name()
            last_name = self.fake.last_name()
            
            # Add some common Nigerian surnames for realism
            nigerian_surnames = [
                'Adebayo', 'Okafor', 'Ibrahim', 'Ogbonna', 'Yusuf', 'Eze', 
                'Musa', 'Okoro', 'Hassan', 'Nwachukwu', 'Abdullahi', 'Okonkwo'
            ]
            
            if random.random() < 0.3:  # 30% chance of Nigerian surname
                last_name = random.choice(nigerian_surnames)
            
            voter = {
                'voter_id': f"NG{i+1:08d}",  # Nigerian format
                'first_name': first_name,
                'last_name': last_name,
                'age': max(18, int(np.random.normal(35, 12))),
                'gender': random.choice(['M', 'F']),
                'state': random.choice(self.nigerian_states),
                'education': random.choice([
                    'Primary', 'Secondary', 'OND/NCE', 'HND/Bachelor', 'Masters', 'PhD'
                ]),
                'occupation': random.choice([
                    'Trader', 'Civil Servant', 'Farmer', 'Teacher', 'Student', 
                    'Engineer', 'Doctor', 'Lawyer', 'Artisan', 'Business Owner'
                ]),
                'registration_date': self.fake.date_between(start_date='-2y', end_date='-1m'),
                'voting_history': random.randint(0, 6),
                'location_id': random.randint(1, 100),
                'phone_number': f"0{random.randint(700, 999)}{random.randint(1000000, 9999999)}",
                'pvc_number': f"PVC{random.randint(10000000, 99999999)}"  # Permanent Voter Card
            }
            voters.append(voter)
            
        return pd.DataFrame(voters)
    
    def _generate_votes_with_fraud(self, voters_df, candidates, locations, num_votes, fraud_rate):
        """Generate votes with Nigerian-specific fraud patterns"""
        votes = []
        election_date = datetime(2024, 11, 16, 8, 0)  # Nigerian election date format
        
        # Generate normal votes
        normal_votes = int(num_votes * (1 - fraud_rate))
        fraud_votes = num_votes - normal_votes
        
        print(f"📊 Generating {normal_votes:,} normal votes...")
        
        for i in range(normal_votes):
            voter = voters_df.sample(1).iloc[0]
            
            # Nigerian voting preferences (simplified)
            candidate_weights = self._get_nigerian_voting_preferences(voter, candidates)
            chosen_candidate = np.random.choice(
                [c['id'] for c in candidates], p=candidate_weights
            )
            
            # Realistic Nigerian voting times (8 AM to 6 PM)
            vote_time = election_date + timedelta(
                hours=random.randint(0, 10),
                minutes=random.randint(0, 59),
                seconds=random.randint(0, 59)
            )
            
            vote = {
                'vote_id': f"VOTE{i+1:08d}",
                'voter_id': voter['voter_id'],
                'candidate_id': chosen_candidate,
                'location_id': voter['location_id'],
                'timestamp': vote_time,
                'voting_method': random.choice(['electronic', 'card_reader']),
                'ip_address': self.fake.ipv4(),
                'session_duration': random.randint(60, 240),  # 1-4 minutes
                'device_fingerprint': hashlib.md5(str(uuid.uuid4()).encode()).hexdigest()[:16],
                'is_fraud': 0,
                'fraud_type': None,
                'transaction_hash': f"0x{hashlib.sha256(str(uuid.uuid4()).encode()).hexdigest()[:40]}"
            }
            votes.append(vote)
        
        # Generate fraud votes
        print(f"🚨 Generating {fraud_votes:,} fraudulent votes...")
        
        fraud_types = [
            'multiple_voting', 'vote_buying', 'ballot_stuffing', 
            'time_manipulation', 'location_fraud', 'ghost_voting'
        ]
        
        for i in range(fraud_votes):
            fraud_type = random.choice(fraud_types)
            base_vote = votes[i % len(votes)].copy()  # Base on existing vote
            
            base_vote['vote_id'] = f"FRAUD{i+1:08d}"
            base_vote['is_fraud'] = 1
            base_vote['fraud_type'] = fraud_type
            
            # Apply fraud pattern
            if fraud_type == 'multiple_voting':
                # Same voter voting multiple times
                base_vote['voter_id'] = random.choice([v['voter_id'] for v in votes[:100]])
                base_vote['timestamp'] = base_vote['timestamp'] + timedelta(minutes=random.randint(5, 60))
                
            elif fraud_type == 'vote_buying':
                # Unusual patterns suggesting vote buying
                base_vote['session_duration'] = random.randint(5, 15)  # Very quick
                base_vote['candidate_id'] = random.choice([1, 2])  # Favor major parties
                
            elif fraud_type == 'ballot_stuffing':
                # Too many votes from one location
                popular_location = random.randint(1, 20)
                base_vote['location_id'] = popular_location
                base_vote['timestamp'] = election_date + timedelta(minutes=random.randint(0, 60))
                
            elif fraud_type == 'time_manipulation':
                # Votes at impossible times
                base_vote['timestamp'] = election_date.replace(
                    hour=random.choice([2, 3, 22, 23])
                )
                
            elif fraud_type == 'location_fraud':
                # Voter voting in wrong location
                base_vote['location_id'] = random.randint(80, 100)  # Remote locations
                
            elif fraud_type == 'ghost_voting':
                # Non-existent voter
                base_vote['voter_id'] = f"GHOST{random.randint(1000000, 9999999)}"
                base_vote['device_fingerprint'] = "UNKNOWN"
            
            votes.append(base_vote)
        
        return pd.DataFrame(votes)
    
    def _get_nigerian_voting_preferences(self, voter, candidates):
        """Simulate Nigerian voting preferences based on demographics"""
        weights = np.ones(len(candidates))
        
        # State-based preferences (simplified)
        state_preferences = {
            'Lagos': [0.25, 0.30, 0.25, 0.15, 0.05],  # More LP/PDP support
            'Kano': [0.40, 0.25, 0.10, 0.20, 0.05],   # More APC/NNPP
            'Rivers': [0.15, 0.45, 0.25, 0.10, 0.05], # More PDP
            # Add more states as needed
        }
        
        if voter['state'] in state_preferences:
            weights = np.array(state_preferences[voter['state']])
        
        # Age-based adjustments
        if voter['age'] > 50:
            weights[0] *= 1.2  # Older voters slightly favor APC
            weights[1] *= 1.1  # and PDP
        elif voter['age'] < 35:
            weights[2] *= 1.3  # Younger voters favor LP
        
        # Education-based adjustments
        if voter['education'] in ['HND/Bachelor', 'Masters', 'PhD']:
            weights[2] *= 1.2  # Educated voters lean LP
        
        return weights / weights.sum()
    
    def save_dataset(self, votes_df, candidates, locations, voters_df, save_dir="fraud_detection_data"):
        """Save generated dataset for training"""
        
        os.makedirs(save_dir, exist_ok=True)
        
        # Save main datasets
        votes_df.to_csv(f"{save_dir}/nigerian_votes_dataset.csv", index=False)
        voters_df.to_csv(f"{save_dir}/nigerian_voters_dataset.csv", index=False)
        
        # Save metadata
        metadata = {
            'generation_date': datetime.now().isoformat(),
            'total_votes': len(votes_df),
            'total_voters': len(voters_df),
            'fraud_votes': int(votes_df['is_fraud'].sum()),
            'fraud_rate': float(votes_df['is_fraud'].mean()),
            'candidates': candidates,
            'total_locations': len(locations),
            'fraud_types': votes_df[votes_df['is_fraud']==1]['fraud_type'].value_counts().to_dict()
        }
        
        with open(f"{save_dir}/dataset_metadata.json", 'w') as f:
            json.dump(metadata, f, indent=2)
        
        with open(f"{save_dir}/candidates.json", 'w') as f:
            json.dump(candidates, f, indent=2)
            
        with open(f"{save_dir}/locations.json", 'w') as f:
            json.dump(locations, f, indent=2)
        
        print(f"\n💾 Dataset saved to {save_dir}/")
        print(f"📊 Summary:")
        print(f"   - Total votes: {len(votes_df):,}")
        print(f"   - Fraud votes: {votes_df['is_fraud'].sum():,}")
        print(f"   - Fraud rate: {votes_df['is_fraud'].mean()*100:.2f}%")
        
        return save_dir