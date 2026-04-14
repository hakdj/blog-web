import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const ALLOWED_GAME_IDS = new Set(['tetris', 'pacman', 'space-invaders', 'minesweeper', '2048', 'dino']);

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('game_high_scores')
      .select('game_id, best_score')
      .eq('user_id', user.id);

    if (error) {
      // 테이블이 아직 생성되지 않은 환경에서는 빈 결과로 안전하게 처리
      if ((error as { code?: string }).code === '42P01') {
        return NextResponse.json({ scores: [] });
      }
      return NextResponse.json({ error: '점수 정보를 불러오거나 저장하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
    }

    return NextResponse.json({ scores: data || [] });
  } catch (error) {
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 });
    }

    const body = await request.json();
    const gameId = String(body.game_id || '').trim();
    const score = Number(body.score);

    if (!ALLOWED_GAME_IDS.has(gameId)) {
      return NextResponse.json({ error: '지원하지 않는 게임입니다.' }, { status: 400 });
    }
    if (!Number.isFinite(score) || score < 0) {
      return NextResponse.json({ error: '점수 형식이 올바르지 않습니다.' }, { status: 400 });
    }

    const normalizedScore = Math.floor(score);

    const { data: current } = await supabase
      .from('game_high_scores')
      .select('best_score')
      .eq('user_id', user.id)
      .eq('game_id', gameId)
      .maybeSingle();

    const nextBest = Math.max(current?.best_score ?? 0, normalizedScore);

    const { data, error } = await supabase
      .from('game_high_scores')
      .upsert(
        {
          user_id: user.id,
          game_id: gameId,
          best_score: nextBest,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,game_id' }
      )
      .select('game_id, best_score')
      .single();

    if (error) {
      if ((error as { code?: string }).code === '42P01') {
        return NextResponse.json(
          { error: 'game_high_scores 테이블이 없습니다. SQL 파일을 먼저 실행해주세요.' },
          { status: 400 }
        );
      }
      return NextResponse.json({ error: '점수 정보를 불러오거나 저장하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, { status: 500 });
    }

    return NextResponse.json({ score: data });
  } catch (error) {
    return NextResponse.json(
      { error: '서버 내부 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500 }
    );
  }
}
