'use client';

import { useRef, useState } from 'react';

const GAME_LIST = [
  { id: 'tetris', name: '테트리스', status: 'ready' },
  { id: 'pacman', name: '팩맨', status: 'ready' },
];

export default function GameHubClient() {
  const [activeGame, setActiveGame] = useState('tetris');
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

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

      {activeGame === 'tetris' && (
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <div className="w-[720px] h-[540px]" onClick={() => focusFrame('tetris')}>
            <iframe
              title="react-tetris"
              src="/games/tetris/index.html"
              className="w-[720px] h-[540px] border-0"
              ref={(el) => {
                iframeRefs.current.tetris = el;
              }}
            />
          </div>
          <p className="text-xs text-gray-500">게임 화면을 클릭해야 조작이 됩니다.</p>
        </div>
      )}

      {activeGame === 'pacman' && (
        <div className="bg-white rounded-xl shadow p-6 flex flex-col items-center gap-2">
          <div className="w-[720px] h-[540px]" onClick={() => focusFrame('pacman')}>
            <iframe
              title="pacman"
              src="https://masonicgit.github.io/pacman/"
              className="w-[720px] h-[540px] border-0"
              ref={(el) => {
                iframeRefs.current.pacman = el;
              }}
            />
          </div>
          <p className="text-xs text-gray-500">게임 화면을 클릭해야 조작이 됩니다.</p>
        </div>
      )}

    </div>
  );
}
