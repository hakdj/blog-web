import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();

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
        profiles!game_high_scores_user_id_fkey (nickname, email)
      `)
      .order('best_score', { ascending: false })
      .limit(limit);

    if (gameId) {
      query = query.eq('game_id', gameId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching game rankings:', error);
      return NextResponse.json({ error: 'Failed to fetch rankings', details: error.message }, { status: 500 });
    }

    const rankings = data?.map(item => {
      // Supabase join results can sometimes be an object or an array depending on the relationship
      const profile = Array.isArray(item.profiles) ? item.profiles[0] : item.profiles;
      return {
        game_id: item.game_id,
        user_id: item.user_id,
        best_score: item.best_score,
        nickname: profile?.nickname || profile?.email || 'Unknown',
        created_at: item.created_at,
      };
    }) || [];

    return NextResponse.json({ rankings });
  } catch (error) {
    console.error('Error in GET /api/games/ranking:', error);
    return NextResponse.json(
      { error: 'Internal server error: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
