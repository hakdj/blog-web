'use client';

import { useMemo, useState } from 'react';
import Snake from 'react-snake-lib';

const GAME_LIST = [
  { id: 'snake', name: '지렁이 게임', status: 'ready' },
  { id: 'brick', name: '벽돌깨기', status: 'soon' },
  { id: 'memory', name: '기억 카드', status: 'soon' },
];

function randomFood(snake: Cell[]) {
  const occupied = new Set(snake.map((c) => `${c.x}-${c.y}`));
  let cell: Cell = { x: 0, y: 0 };
  do {
    cell = {
      x: Math.floor(Math.random() * GRID_SIZE),
      y: Math.floor(Math.random() * GRID_SIZE),
    };
  } while (occupied.has(`${cell.x}-${cell.y}`));
  return cell;
}

export default function GameHubClient() {
  const [activeGame, setActiveGame] = useState('snake');
  const [isRunning, setIsRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [speed, setSpeed] = useState(140);

  const gameStatus = useMemo(() => {
    return isRunning ? '진행 중' : '대기';
  }, [isRunning]);

  const resetGame = () => {
    setScore(0);
    setIsRunning(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">그때 그 게임</h1>
        <p className="text-gray-600">간단한 레트로 게임으로 추억을 즐겨보세요</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {GAME_LIST.map((game) => (
          <button
            key={game.id}
            onClick={() => setActiveGame(game.id)}
            className={`px-4 py-2 rounded-lg font-medium ${
              activeGame === game.id ? 'bg-purple-600 text-white' : 'bg-white border text-gray-700'
            }`}
          >
            {game.name}
            {game.status === 'soon' && <span className="ml-2 text-xs text-gray-400">(준비중)</span>}
          </button>
        ))}
      </div>

      {activeGame === 'snake' && (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow p-5 space-y-4">
            <h2 className="text-lg font-bold text-gray-900">지렁이 게임</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <p>상태: {gameStatus}</p>
              <p>점수: {score}</p>
              <p>최고점수: {bestScore}</p>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => setIsRunning(true)}
                className="w-full bg-purple-600 text-white rounded-lg px-4 py-2 font-medium hover:bg-purple-700"
              >
                시작
              </button>
              <button
                onClick={() => setIsRunning(false)}
                className="w-full bg-gray-100 text-gray-700 rounded-lg px-4 py-2 font-medium hover:bg-gray-200"
              >
                일시정지
              </button>
              <button
                onClick={resetGame}
                className="w-full border rounded-lg px-4 py-2 font-medium text-gray-700 hover:bg-gray-50"
              >
                다시 시작
              </button>
            </div>
            <div>
              <label className="text-xs text-gray-500">속도</label>
              <input
                type="range"
                min="80"
                max="200"
                step="10"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="w-full"
              />
            </div>
            <div className="text-xs text-gray-500">
              모듈 기반 게임입니다. 방향키로 이동합니다.
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow p-6 flex justify-center">
            <Snake
              onGameStart={() => setIsRunning(true)}
              onGameOver={() => setIsRunning(false)}
              onScoreChange={(nextScore: number) => {
                setScore(nextScore);
                setBestScore((prev) => (nextScore > prev ? nextScore : prev));
              }}
              width="420px"
              height="420px"
              snakeSpeed={speed}
              bgColor="#f8fafc"
              innerBorderColor="#e2e8f0"
              borderColor="#cbd5f5"
              snakeColor="#60a5fa"
              snakeHeadColor="#3b82f6"
              appleColor="#f97316"
              size={20}
              startGameText="게임 시작"
              startButtonStyle={{
                color: 'white',
                padding: '8px 20px',
                backgroundColor: '#7c3aed',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
              }}
              startButtonHoverStyle={{
                backgroundColor: '#6d28d9',
              }}
              noWall={false}
            />
          </div>
        </div>
      )}

      {activeGame !== 'snake' && (
        <div className="bg-white rounded-xl shadow p-6 text-center text-gray-600">
          다음 게임을 준비 중입니다. 조금만 기다려주세요!
        </div>
      )}
    </div>
  );
}
