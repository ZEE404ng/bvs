from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from datetime import datetime
from typing import Dict, List, Optional
import json
import asyncio
import uvicorn
from fraud_detector import BlockchainVotingFraudDetector

# Pydantic models
class VoteInput(BaseModel):
    vote_id: str
    voter_id: str
    candidate_id: int
    location_id: int
    timestamp: datetime
    voting_method: str
    ip_address: str
    session_duration: int
    device_fingerprint: str
    transaction_hash: Optional[str] = None

class FraudResponse(BaseModel):
    vote_id: str
    is_fraud: bool
    fraud_probability: float
    confidence: str
    fraud_indicators: List[str]
    timestamp: str

class FraudDetectionAPI:
    """FastAPI application for real-time fraud detection"""
    
    def __init__(self):
        self.app = FastAPI(
            title="Blockchain Voting Fraud Detection API",
            description="Real-time fraud detection for blockchain voting systems",
            version="1.0.0"
        )
        
        self.setup_cors()
        self.fraud_detector = BlockchainVotingFraudDetector()
        self.connected_websockets = set()
        self.fraud_alerts = []
        
        self.setup_routes()
    
    def setup_cors(self):
        """Setup CORS middleware"""
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],  # React app
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
    
    def setup_routes(self):
        """Setup API routes"""
        
        @self.app.on_event("startup")
        async def startup():
            print("🚀 Starting Fraud Detection API...")
            # Try to load existing models
            self.fraud_detector.load_models()
            print("✅ Fraud Detection API ready!")
        
        @self.app.get("/")
        async def root():
            return {
                "message": "Blockchain Voting Fraud Detection API",
                "status": "running",
                "version": "1.0.0"
            }
        
        @self.app.post("/analyze-vote", response_model=FraudResponse)
        async def analyze_vote(vote: VoteInput):
            """Analyze a single vote for fraud"""
            try:
                # Convert to dict
                vote_data = vote.dict()
                
                # Get fraud prediction
                result = self.fraud_detector.predict_fraud_realtime(vote_data)
                
                # If fraud detected, store alert and notify websockets
                if result['is_fraud']:
                    await self.handle_fraud_alert(result)
                
                return FraudResponse(**result)
                
            except Exception as e:
                raise HTTPException(status_code=500, detail=str(e))
        
        @self.app.get("/alerts")
        async def get_recent_alerts(limit: int = 50):
            """Get recent fraud alerts"""
            return {
                "alerts": self.fraud_alerts[-limit:],
                "total_alerts": len(self.fraud_alerts)
            }
        
        @self.app.get("/stats")
        async def get_statistics():
            """Get API statistics"""
            return {
                "connected_clients": len(self.connected_websockets),
                "total_alerts": len(self.fraud_alerts),
                "model_loaded": self.fraud_detector.is_trained,
                "uptime": datetime.now().isoformat()
            }
        
        @self.app.websocket("/ws/alerts")
        async def websocket_alerts(websocket: WebSocket):
            """WebSocket endpoint for real-time fraud alerts"""
            await websocket.accept()
            self.connected_websockets.add(websocket)
            
            try:
                while True:
                    # Keep connection alive
                    await asyncio.sleep(30)
                    await websocket.send_text(json.dumps({
                        "type": "ping",
                        "timestamp": datetime.now().isoformat()
                    }))
                    
            except WebSocketDisconnect:
                self.connected_websockets.remove(websocket)
    
    async def handle_fraud_alert(self, fraud_result: Dict):
        """Handle fraud alert - store and broadcast"""
        alert = {
            "alert_id": f"ALERT_{len(self.fraud_alerts) + 1:06d}",
            "vote_id": fraud_result['vote_id'],
            "fraud_probability": fraud_result['fraud_probability'],
            "confidence": fraud_result['confidence'],
            "indicators": fraud_result['fraud_indicators'],
            "timestamp": fraud_result['timestamp'],
            "severity": self._get_severity(fraud_result['fraud_probability'])
        }
        
        self.fraud_alerts.append(alert)
        
        # Broadcast to connected websockets
        if self.connected_websockets:
            message = {
                "type": "fraud_alert",
                "data": alert
            }
            
            # Send to all connected clients
            disconnected = set()
            for websocket in self.connected_websockets:
                try:
                    await websocket.send_text(json.dumps(message))
                except:
                    disconnected.add(websocket)
            
            # Remove disconnected clients
            self.connected_websockets -= disconnected
    
    def _get_severity(self, fraud_probability: float) -> str:
        """Determine alert severity"""
        if fraud_probability >= 0.9:
            return "critical"
        elif fraud_probability >= 0.7:
            return "high"
        elif fraud_probability >= 0.5:
            return "medium"
        else:
            return "low"
    
    def run(self, host="127.0.0.1", port=8001):
        """Run the API server"""
        print(f"🌐 Starting fraud detection API on http://{host}:{port}")
        uvicorn.run(self.app, host=host, port=port)

# Initialize API
api = FraudDetectionAPI()

if __name__ == "__main__":
    api.run()