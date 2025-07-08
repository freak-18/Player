import React, { useEffect, useState, useRef } from 'react';
import socket from './socket';
import './PlayerApp.css';

function PlayerApp() {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [joined, setJoined] = useState(false);
  const [question, setQuestion] = useState(null);
  const [selected, setSelected] = useState('');
  const [timeLeft, setTimeLeft] = useState(0);
  const [visibleLeaderboard, setVisibleLeaderboard] = useState(false);
  const [leaderboard, setLeaderboard] = useState([]);
  const [quizEnded, setQuizEnded] = useState(false);
  const [players, setPlayers] = useState([]);
  const [maxPlayers, setMaxPlayers] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [allAnswered, setAllAnswered] = useState(false);
  const [correctAnswer, setCorrectAnswer] = useState('');
  const [joining, setJoining] = useState(false);
  const [showingBetweenQuestions, setShowingBetweenQuestions] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const prevLeaderboardRef = useRef([]);

  const joinRoom = () => {
    if (name.trim() && roomCode.trim()) {
      setErrorMessage('');
      setJoining(true);
      socket.emit('join-room', { name, roomCode });
    }
  };

  const getEmoji = (index) => {
    const emojis = ['🐺', '🐻', '🦖', '🐼', '🦊', '🐯', '🦞', '🦝', '🦁', '🦇', '🐦‍🔥'];
    return emojis[index % emojis.length];
  };

  const getRankChange = (id, index) => {
    const oldIndex = prevLeaderboardRef.current.findIndex((p) => p.id === id);
    if (oldIndex === -1) return '';
    if (oldIndex > index) return 'up';
    if (oldIndex < index) return 'down';
    return '';
  };

  useEffect(() => {
    socket.on('question', (q) => {
      if (q && q.text && q.options) {
        setQuestion(q);
        setSelected('');
        setCorrectAnswer('');
        setTimeLeft(q.timeLimit || 15);
        setAllAnswered(false);
        setVisibleLeaderboard(false);
        setShowingBetweenQuestions(false);
        setIsLocked(false);
      } else {
        setQuestion(null);
      }
    });

    socket.on('leaderboard', (data) => {
      if (!quizEnded) {
        prevLeaderboardRef.current = leaderboard;
        setLeaderboard(data.filter(p => p && p.name.toLowerCase() !== 'host'));
        setVisibleLeaderboard(true);
        setShowingBetweenQuestions(true);
      }
    });

    socket.on('final-leaderboard', (data) => {
      prevLeaderboardRef.current = leaderboard;
      setLeaderboard(data.filter(p => p && p.name.toLowerCase() !== 'host'));
      setVisibleLeaderboard(false);
      setQuizEnded(true);
    });

    socket.on('quiz-end', () => setQuizEnded(true));

    socket.on('lobby-update', ({ players, maxPlayers }) => {
      setPlayers(players || []);
      setMaxPlayers(maxPlayers || null);
      setJoined(true);
      setJoining(false);
    });

    socket.on('time-left', (time) => {
      setTimeLeft(time);
    });

    socket.on('room-error', (data) => {
      const message = data?.message || 'Unknown room error.';
      setErrorMessage(message);
      setJoined(false);
      setJoining(false);
    });

    socket.on('room-full', () => {
      setErrorMessage('🚫 Room is full. Please try another room or wait.');
      setJoined(false);
      setJoining(false);
    });

    socket.on('all-answered', (data) => {
      setAllAnswered(true);
      setCorrectAnswer(data.correct || 'N/A');
    });
    
    socket.on('question-locked', () => {
      setIsLocked(true);
    });

    socket.on('kicked', () => {
      alert('❌ You have been kicked from the room by the host.');
      resetPlayerState();
    });

    return () => socket.removeAllListeners();
  }, [leaderboard, quizEnded]);

  const resetPlayerState = () => {
    setName('');
    setRoomCode('');
    setJoined(false);
    setQuestion(null);
    setSelected('');
    setTimeLeft(0);
    setVisibleLeaderboard(false);
    setLeaderboard([]);
    setQuizEnded(false);
    setPlayers([]);
    setMaxPlayers(null);
    setErrorMessage('');
    setAllAnswered(false);
    setCorrectAnswer('');
    setJoining(false);
    setShowingBetweenQuestions(false);
    setIsLocked(false);
  };

  const handleSelect = (opt) => {
    if (!selected && !isLocked) {
      setSelected(opt);
      socket.emit('answer', { option: opt, roomCode });
    }
  };

  const filteredLeaderboard = leaderboard
    .filter(p => p.name.toLowerCase() !== 'host')
    .sort((a, b) => b.score - a.score);

  const topScore = Math.max(...filteredLeaderboard.map(p => p.score), 1);
  const filteredPlayers = players.filter(p => p.name.toLowerCase() !== 'host');

  return (
    <div className="quiz-container">
      {(visibleLeaderboard || showingBetweenQuestions) && !quizEnded && (
        <div className="leaderboard-overlay">
          <h3>🏆 Leaderboard</h3>
          <div className="leaderboard">
            {filteredLeaderboard.map((p, i) => {
              const change = getRankChange(p.id, i);
              const isCurrent = p.name === name;
              return (
                <div
                  key={p.id}
                  className={`leaderboard-entry ${change} ${isCurrent ? 'highlight' : ''}`}
                >
                  <div className="bar" style={{ width: `${(p.score / topScore) * 100}%` }}></div>
                  <span className="rank">{i + 1}.</span>
                  <span className="emoji">{getEmoji(i)}</span>
                  <span className="name">{p.name}</span>
                  <span className="score">{p.score} p</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!joined ? (
        <div className="join-container">
          <div className="join-box">
            <h2>Join Quiz Room</h2>
            <input type="text" placeholder="Enter Name" value={name} onChange={(e) => setName(e.target.value)} />
            <input type="text" placeholder="Enter Room Code" value={roomCode} onChange={(e) => setRoomCode(e.target.value)} />
            <button onClick={joinRoom} disabled={joining}>
              {joining ? 'Joining...' : 'Join'}
            </button>
            {errorMessage && <p className="error-message">{errorMessage}</p>}
          </div>
        </div>
      ) : quizEnded ? (
        <>
          <h3> ⮞⮞ Quiz Ended ⮜⮜</h3>
          <h3>🏆 Final Leaderboard </h3>
          <div className="leaderboard">
            {filteredLeaderboard.map((p, i) => {
              const change = getRankChange(p.id, i);
              const isCurrent = p.name === name;
              return (
                <div
                  key={p.id}
                  className={`leaderboard-entry ${change} ${isCurrent ? 'highlight' : ''}`}
                >
                  <div className="bar" style={{ width: `${(p.score / topScore) * 100}%` }}></div>
                  <span className="rank">{i + 1}.</span>
                  <span className="emoji">{getEmoji(i)}</span>
                  <span className="name">{p.name}</span>
                  <span className="score">{p.score} p</span>
                </div>
              );
            })}
          </div>
        </>
      ) : question ? (
        <>
          <h3>⏱ Time Left: {Math.max(timeLeft, 0)}s</h3>
          <h4>📝 {question.text}</h4>
          <ul className="options-list">
            {question.options.map((opt, i) => (
              <li key={i}>
                <button
                  disabled={!!selected || isLocked}
                  className={selected === opt ? 'option-selected' : ''}
                  onClick={() => handleSelect(opt)}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
          {selected && <p className="answer-feedback">✅ Answer Locked: {selected}</p>}
          {allAnswered && (
            <div className="answer-feedback">
              ✅ All players have answered the question
              <br />
               <strong>Correct Answer:</strong> {correctAnswer || 'N/A'}
            </div>
          )}
        </>
      ) : (
        <div className="waiting-room">
          <h3> Waiting for Host to Start the Quiz...</h3>
          <p>Room Code: <strong>{roomCode}</strong></p>
          <h4>
             ▼ Players in the Lobby ▼ ({filteredPlayers.length}
            {maxPlayers ? ` / ${maxPlayers}` : ''})
          </h4>
          <ul>
            {filteredPlayers.map(p => (
              <li key={p.id}>★ {p.name}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default PlayerApp;
