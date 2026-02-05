'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

type Cell = { x: number; y: number };

const GRID_SIZE = 20;
const CANVAS_SIZE = 420;
const CELL_SIZE = CANVAS_SIZE / GRID_SIZE;

const DIRECTIONS: Record<string, Cell> = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

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
  const [snake, setSnake] = useState<Cell[]>([{ x: 10, y: 10 }]);
  const [direction, setDirection] = useState<Cell>({ x: 1, y: 0 });
  const [food, setFood] = useState<Cell>({ x: 5, y: 5 });
  const [isRunning, setIsRunning] = useState(false);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [speed, setSpeed] = useState(140);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const directionRef = useRef<Cell>(direction);
  const snakeRef = useRef<Cell[]>(snake);
  const loopRef = useRef<NodeJS.Timeout | null>(null);

  const gameStatus = useMemo(() => {
    return isRunning ? '진행 중' : '대기';
  }, [isRunning]);

  useEffect(() => {
    directionRef.current = direction;
  }, [direction]);

  useEffect(() => {
    snakeRef.current = snake;
  }, [snake]);

  useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      const next = DIRECTIONS[event.key];
      if (!next) return;
      const current = directionRef.current;
      if (current.x + next.x === 0 && current.y + next.y === 0) return;
      setDirection(next);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  useEffect(() => {
    if (!isRunning) {
      if (loopRef.current) clearInterval(loopRef.current);
      return;
    }
    loopRef.current = setInterval(() => {
      setSnake((prev) => {
        const head = prev[0];
        const next = {
          x: (head.x + directionRef.current.x + GRID_SIZE) % GRID_SIZE,
          y: (head.y + directionRef.current.y + GRID_SIZE) % GRID_SIZE,
        };
        const hitSelf = prev.some((cell) => cell.x === next.x && cell.y === next.y);
        if (hitSelf) {
          setIsRunning(false);
          return prev;
        }
        const newSnake = [next, ...prev];
        if (next.x === food.x && next.y === food.y) {
          setScore((s) => s + 1);
          setFood(randomFood(newSnake));
          return newSnake;
        }
        newSnake.pop();
        return newSnake;
      });
    }, speed);

    return () => {
      if (loopRef.current) clearInterval(loopRef.current);
    };
  }, [isRunning, speed, food]);

  useEffect(() => {
    if (score > bestScore) {
      setBestScore(score);
    }
  }, [score, bestScore]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    ctx.strokeStyle = '#e2e8f0';
    for (let i = 0; i <= GRID_SIZE; i += 1) {
      const pos = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(pos, 0);
      ctx.lineTo(pos, CANVAS_SIZE);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, pos);
      ctx.lineTo(CANVAS_SIZE, pos);
      ctx.stroke();
    }

    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(
      food.x * CELL_SIZE + CELL_SIZE / 2,
      food.y * CELL_SIZE + CELL_SIZE / 2,
      CELL_SIZE / 2.5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    snake.forEach((cell, index) => {
      ctx.fillStyle = index === 0 ? '#3b82f6' : '#60a5fa';
      ctx.fillRect(cell.x * CELL_SIZE + 2, cell.y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4);
    });
  }, [snake, food]);

  const resetGame = () => {
    setSnake([{ x: 10, y: 10 }]);
    setDirection({ x: 1, y: 0 });
    setFood({ x: 5, y: 5 });
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
              방향키로 이동합니다. 벽은 이어지고 자기 몸에 닿으면 종료됩니다.
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow p-6 flex justify-center">
            <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} />
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
