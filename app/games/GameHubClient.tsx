'use client';

import { useMemo, useRef, useState } from 'react';

const GAME_LIST = [
  { id: 'snake', name: '지렁이 게임', status: 'ready' },
  { id: 'brick', name: '벽돌깨기', status: 'ready' },
  { id: 'memory', name: '기억 카드', status: 'ready' },
  { id: 'shooter', name: '1945 미니', status: 'ready' },
  { id: 'tetris', name: '테트리스', status: 'ready' },
];

export default function GameHubClient() {
  const [activeGame, setActiveGame] = useState('snake');
  const [isRunning, setIsRunning] = useState(false);
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const gameStatus = useMemo(() => {
    return isRunning ? '진행 중' : '대기';
  }, [isRunning]);

  const resetGame = () => {
    setIsRunning(false);
    setTimeout(() => setIsRunning(true), 50);
  };

  const focusFrame = (id: string) => {
    const frame = iframeRefs.current[id];
    frame?.contentWindow?.focus();
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
              <p>모듈 게임으로 빠르게 즐길 수 있어요.</p>
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
            <div className="text-xs text-gray-500">
              모듈 기반 게임입니다. 방향키로 이동합니다.
            </div>
          </div>

          <div className="lg:col-span-2 bg-white rounded-xl shadow p-6 flex justify-center">
            {isRunning ? (
              <div
                className="w-[420px] h-[420px]"
                onClick={() => focusFrame('snake')}
              >
                <iframe
                  title="snake-game"
                  src="/games/snake/index.html"
                  className="w-[420px] h-[420px] border-0"
                  ref={(el) => {
                    iframeRefs.current.snake = el;
                  }}
                />
              </div>
            ) : (
              <div className="w-[420px] h-[420px] flex items-center justify-center text-gray-500">
                시작 버튼을 눌러 게임을 시작하세요.
              </div>
            )}
          </div>
        </div>
      )}

      {activeGame === 'brick' && (
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <div
            className="w-[420px] h-[320px]"
            onClick={() => focusFrame('brick')}
          >
            <iframe
              title="brick-breaker"
              src="/games/brick/index.html"
              className="w-[420px] h-[320px] border-0"
              ref={(el) => {
                iframeRefs.current.brick = el;
              }}
            />
          </div>
          <p className="text-xs text-gray-500">게임 화면을 클릭해야 키보드 조작이 됩니다.</p>
        </div>
      )}

      {activeGame === 'memory' && (
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <div
            className="w-[320px] h-[360px]"
            onClick={() => focusFrame('memory')}
          >
            <iframe
              title="memory-card"
              src="/games/memory/index.html"
              className="w-[320px] h-[360px] border-0"
              ref={(el) => {
                iframeRefs.current.memory = el;
              }}
            />
          </div>
          <p className="text-xs text-gray-500">게임 화면을 클릭해야 조작이 됩니다.</p>
        </div>
      )}

      {activeGame === 'shooter' && (
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <div
            className="w-[360px] h-[440px]"
            onClick={() => focusFrame('shooter')}
          >
            <iframe
              title="1945-mini"
              src="/games/shooter/index.html"
              className="w-[360px] h-[440px] border-0"
              ref={(el) => {
                iframeRefs.current.shooter = el;
              }}
            />
          </div>
          <p className="text-xs text-gray-500">게임 화면을 클릭해야 키보드 조작이 됩니다.</p>
        </div>
      )}

      {activeGame === 'tetris' && (
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <div
            className="w-[220px] h-[440px]"
            onClick={() => focusFrame('tetris')}
          >
            <iframe
              title="tetris-mini"
              src="/games/tetris/index.html"
              className="w-[220px] h-[440px] border-0"
              ref={(el) => {
                iframeRefs.current.tetris = el;
              }}
            />
          </div>
          <p className="text-xs text-gray-500">게임 화면을 클릭해야 키보드 조작이 됩니다.</p>
        </div>
      )}
    </div>
  );
}
