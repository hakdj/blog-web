import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      // 랭킹은 로그인 없이도 조회 가능하게 하거나, 
      // 최소한 랭킹 페이지 접근은 허용하되 특정 정보는 제한 가능.
      // 여기서는 일단 로그인 필요 없음.
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(Number(searchParams.get('limit') || 5), 10);
    const gameId = searchParams.get('game_id');

    let query = supabase
      .from('game_high_scores')
      .select(`
        id,
        game_id,
        user_id,
        best_score,
        created_at,
        profiles (nickname, email)
      `)
      .order('best_score', { ascending: false })
      .limit(limit);

    if (gameId) {
      query = query.eq('game_id', gameId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching game rankings:', error);
      return NextResponse.json({ error: 'Failed to fetch rankings' }, { status: 500 });
    }

    const rankings = data?.map(item => ({
      game_id: item.game_id,
      user_id: item.user_id,
      best_score: item.best_score,
      nickname: item.profiles?.[0]?.nickname || item.profiles?.[0]?.email || 'Unknown', // Access first element of profiles array
      created_at: item.created_at,
    })) || [];

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Error in GET /api/games/ranking:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
