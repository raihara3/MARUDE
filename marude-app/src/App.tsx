import { useState } from 'react';
import { WelcomeScreen } from './components/WelcomeScreen';
import { VideoRoom } from './components/VideoRoom';

function App() {
  const [roomUrl, setRoomUrl] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('');

  const handleJoinRoom = (name: string, url: string) => {
    setUserName(name);
    setRoomUrl(url);
  };

  const handleLeaveRoom = () => {
    setRoomUrl(null);
    setUserName('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-50">
      {!roomUrl ? (
        <WelcomeScreen onJoinRoom={handleJoinRoom} />
      ) : (
        <VideoRoom 
          roomUrl={roomUrl} 
          userName={userName} 
          onLeave={handleLeaveRoom} 
        />
      )}
    </div>
  );
}

export default App;