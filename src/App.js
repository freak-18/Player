import React, { useEffect, useState } from 'react';
import socket from './socket';

function PlayerApp() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState('');
  const [pointsAwarded, setPointsAwarded] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [quizEnded, setQuizEnded] = useState(false);
  const [players, setPlayers] = useState([]);
  const [errorMessage, setErrorMessage] = useState('');

  const joinRoom = () => {
    if (name.trim() && roomCode.trim()) {
      setErrorMessage('');
      socket.emit('join', { name, roomCode });
    }
  };

  useEffect(() => {
    socket.on('question', (q) => {
      if (q && q.text && q.options) {
        setQuestion(q);
        setSelected('');
        setPointsAwarded(null);
        setShowLeaderboard(false);
        setTimeLeft(q.timeLimit || 15);
      } else {
        setQuestion(null);
        console.warn('Received invalid question:', q);
      }
    });

    socket.on('start-quiz', () => {
      socket.emit('request-next-question', roomCode);
    });

    socket.on('question-ended', () => {
      setShowLeaderboard(true);
    });

    socket.on('leaderboard', (data) => {
      setLeaderboard(data);
    });

    socket.on('final-leaderboard', (data) => {
      setLeaderboard(data);
    });

    socket.on('quiz-end', () => {
      setQuizEnded(true);
    });

    socket.on('lobby-update', (data) => {
      setPlayers(data);
      if (data.length > 0) {
        setJoined(true);
      }
    });

    socket.on('time-left', (time) => {
      setTimeLeft(time);
    });

    socket.on('answer-result', ({ score }) => {
      setPointsAwarded(score);
    });

    socket.on('room-error', ({ message }) => {
      setErrorMessage(message);
      setJoined(false);
    });

    socket.on('question-error', (msg) => {
      console.error('Server error:', msg);
      setQuestion(null);
    });

    return () => {
      socket.off('question');
      socket.off('start-quiz');
      socket.off('question-ended');
      socket.off('leaderboard');
      socket.off('final-leaderboard');
      socket.off('quiz-end');
      socket.off('lobby-update');
      socket.off('time-left');
      socket.off('answer-result');
      socket.off('room-error');
      socket.off('question-error');
    };
  }, [roomCode]);

  const handleSelect = (opt) => {
    if (!selected) {
      setSelected(opt);
      socket.emit('answer', { option: opt, roomCode });
    }
  };

  const filteredLeaderboard = leaderboard.filter(p => p.name.toLowerCase() !== 'host');
  const filteredPlayers = players.filter(p => p.name.toLowerCase() !== 'host');

  if (!joined) {
    return (
      <div style={{ padding: '20px' }}>
        <h2>Join Quiz Room</h2>
        <input
          type="text"
          placeholder="Enter Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ width: '100%', marginBottom: '10px' }}
        />
        <input
          type="text"
          placeholder="Enter Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value)}
          style={{ width: '100%', marginBottom: '10px' }}
        />
        <button onClick={joinRoom}>Join</button>
        {errorMessage && (
          <p style={{ color: 'red', marginTop: '10px' }}>{errorMessage}</p>
        )}
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h2>Welcome {name}</h2>

      {quizEnded ? (
        <div>
          <h3>🎉 Quiz Ended</h3>
          <h4>🏆 Final Leaderboard</h4>
          <ul>
            {filteredLeaderboard.map((p, i) => (
              <li key={p.id}>
                {i + 1}. {p.name} - {p.score} pts
              </li>
            ))}
          </ul>
        </div>
      ) : question && question.text && question.options ? (
        <div>
          <h3>⏱ Time Left: {Math.max(timeLeft, 0)}s</h3>
          <h4>📝 {question.text}</h4>
          <ul style={{ listStyleType: 'none', padding: 0 }}>
            {question.options.map((opt, i) => (
              <li key={i}>
                <button
                  disabled={!!selected}
                  onClick={() => handleSelect(opt)}
                  style={{
                    margin: '5px 0',
                    background: selected === opt ? '#4caf50' : '#eee',
                    width: '100%',
                    padding: '10px',
                    cursor: selected ? 'not-allowed' : 'pointer',
                    border: '1px solid #ccc',
                    borderRadius: '5px'
                  }}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>

          {selected && (
            <p style={{ marginTop: '10px', fontWeight: 'bold' }}>
              ✅ Answer Locked: {selected}
            </p>
          )}

          {showLeaderboard && (
            <div style={{ marginTop: '20px' }}>
              <h4>🏆 Leaderboard</h4>
              <ul>
                {filteredLeaderboard.map((p, i) => (
                  <li key={p.id}>
                    {i + 1}. {p.name} - {p.score}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : (
        <div style={{
          padding: '20px',
          border: '2px dashed #aaa',
          borderRadius: '10px',
          background: '#f3f3f3'
        }}>
          <h3>🕓 Waiting for Host to Start the Quiz...</h3>
          <p>Room Code: <strong>{roomCode}</strong></p>

          <h4>👥 Players in the Lobby</h4>
          <ul>
            {filteredPlayers.map((p) => (
              <li key={p.id} style={{ marginBottom: '5px' }}>✅ {p.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PlayerApp;
