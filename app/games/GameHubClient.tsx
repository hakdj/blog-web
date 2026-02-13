'use client';

import { useRef, useState } from 'react';

const GAME_LIST = [
  { id: 'tetris', name: '테트리스', status: 'ready' },
  { id: 'pacman', name: '팩맨', status: 'ready' },
  { id: 'space-invaders', name: '스페이스 인베이더', status: 'ready' },
  { id: 'minesweeper', name: '지뢰찾기', status: 'ready' },
  { id: '2048', name: '2048', status: 'ready' },
];

const GAME_DESCRIPTIONS: Record<string, { title: string; desc: string; controls: string }> = {
  tetris: {
    title: '테트리스',
    desc: '떨어지는 블록을 맞춰 가로줄을 지우는 퍼즐 게임입니다.',
    controls: '조작: ← → 이동, ↑ 회전, ↓ 소프트 드롭, Space 하드 드롭, P 일시정지',
  },
  pacman: {
    title: '팩맨',
    desc: '미로에서 점을 먹으며 유령을 피하는 고전 아케이드 게임입니다.',
    controls: '조작: 방향키 이동',
  },
  'space-invaders': {
    title: '스페이스 인베이더',
    desc: '외계 함대를 격추하며 최대한 오래 버티는 레트로 슈팅 게임입니다.',
    controls: '조작: ← → 이동, Space 발사, R 재시작',
  },
  minesweeper: {
    title: '지뢰찾기',
    desc: '숫자 힌트를 보고 지뢰를 피해 모든 칸을 여는 고전 퍼즐 게임입니다.',
    controls: '조작: 좌클릭 열기, 우클릭 깃발, 새 게임 버튼으로 리셋',
  },
  '2048': {
    title: '2048',
    desc: '같은 숫자를 합쳐 2048을 만드는 레트로 퍼즐 게임입니다.',
    controls: '조작: 방향키 이동, 새 게임 버튼으로 리셋',
  },
};

export default function GameHubClient() {
  const [activeGame, setActiveGame] = useState('tetris');
  const iframeRefs = useRef<Record<string, HTMLIFrameElement | null>>({});

  const focusFrame = (id: string) => {
    const frame = iframeRefs.current[id];
    frame?.contentWindow?.focus();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 text-gray-100">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 tracking-wide text-lime-200">그때 그 게임</h1>
        <p className="text-gray-300">간단한 레트로 게임으로 추억을 즐겨보세요</p>
      </div>

      <div className="flex flex-wrap gap-3 mb-6">
        {GAME_LIST.map((game) => (
          <button
            key={game.id}
            onClick={() => setActiveGame(game.id)}
            className={`px-4 py-2 rounded-lg font-medium border transition-colors ${
              activeGame === game.id
                ? 'bg-lime-700 text-lime-100 border-lime-500'
                : 'bg-gray-800 border-gray-700 text-gray-200 hover:bg-gray-700'
            }`}
          >
            {game.name}
            {game.status === 'soon' && <span className="ml-2 text-xs text-gray-400">(준비중)</span>}
          </button>
        ))}
      </div>

      <div className="mb-4 rounded-lg border border-gray-700 bg-gray-900/70 p-4">
        <p className="text-sm font-semibold text-lime-200">{GAME_DESCRIPTIONS[activeGame]?.title}</p>
        <p className="text-sm text-gray-300 mt-1">{GAME_DESCRIPTIONS[activeGame]?.desc}</p>
        <p className="text-xs text-gray-400 mt-2">{GAME_DESCRIPTIONS[activeGame]?.controls}</p>
      </div>

      {activeGame === 'tetris' && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/90 shadow-2xl p-6 flex flex-col items-center gap-2">
          <div className="w-[720px] h-[540px]" onClick={() => focusFrame('tetris')}>
            <iframe
              title="react-tetris"
              src="/games/tetris/index.html"
              className="w-[720px] h-[540px] border-0 rounded-lg"
              ref={(el) => {
                iframeRefs.current.tetris = el;
              }}
            />
          </div>
          <p className="text-xs text-gray-400">게임 화면을 클릭해야 조작이 됩니다.</p>
        </div>
      )}

      {activeGame === 'pacman' && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/90 shadow-2xl p-6 flex flex-col items-center gap-2">
          <div className="w-[720px] h-[540px]" onClick={() => focusFrame('pacman')}>
            <iframe
              title="pacman"
              src="https://masonicgit.github.io/pacman/"
              className="w-[720px] h-[540px] border-0 rounded-lg"
              ref={(el) => {
                iframeRefs.current.pacman = el;
              }}
            />
          </div>
          <p className="text-xs text-gray-400">게임 화면을 클릭해야 조작이 됩니다.</p>
        </div>
      )}

      {activeGame === 'space-invaders' && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/90 shadow-2xl p-6 flex flex-col items-center gap-2">
          <div className="w-[720px] h-[540px]" onClick={() => focusFrame('space-invaders')}>
            <iframe
              title="space-invaders"
              src="/games/space-invaders/index.html"
              className="w-[720px] h-[540px] border-0 rounded-lg"
              ref={(el) => {
                iframeRefs.current['space-invaders'] = el;
              }}
            />
          </div>
          <p className="text-xs text-gray-400">조작: ← → 이동, Space 발사, R 재시작</p>
        </div>
      )}

      {activeGame === 'minesweeper' && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/90 shadow-2xl p-6 flex flex-col items-center gap-2">
          <div className="w-[740px] h-[560px]" onClick={() => focusFrame('minesweeper')}>
            <iframe
              title="minesweeper"
              src="/games/minesweeper/index.html"
              className="w-[740px] h-[560px] border-0 rounded-lg"
              ref={(el) => {
                iframeRefs.current.minesweeper = el;
              }}
            />
          </div>
          <p className="text-xs text-gray-400">조작: 좌클릭 열기, 우클릭 깃발, 새 게임으로 다시 시작</p>
        </div>
      )}

      {activeGame === '2048' && (
        <div className="rounded-xl border border-gray-700 bg-gray-900/90 shadow-2xl p-6 flex flex-col items-center gap-2">
          <div className="w-[720px] h-[540px]" onClick={() => focusFrame('2048')}>
            <iframe
              title="2048"
              src="/games/2048/index.html"
              className="w-[720px] h-[540px] border-0 rounded-lg"
              ref={(el) => {
                iframeRefs.current['2048'] = el;
              }}
            />
          </div>
          <p className="text-xs text-gray-400">조작: 방향키 이동, 새 게임으로 다시 시작</p>
        </div>
      )}

    </div>
  );
}
