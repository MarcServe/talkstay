import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/integrations/supabase/client';
import { Star } from 'lucide-react';

interface Review {
  id: string;
  assistant_id: string;
  rating: number;
  comment: string | null;
  origin: string | null;
  channel: string | null;
  created_at: string;
}

interface Props {
  assistantId?: string;
}

export const ReviewsDashboard: React.FC<Props> = ({ assistantId }) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!assistantId) return;
    let active = true;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.
      from('reviews').
      select('id, assistant_id, rating, comment, origin, channel, created_at').
      eq('assistant_id', assistantId).
      order('created_at', { ascending: false });
      if (!active) return;
      if (error) {
        console.error('Failed to load reviews', error);
        setReviews([]);
      } else {
        setReviews(data || []);
      }
      setLoading(false);
    })();
    return () => {active = false;};
  }, [assistantId]);

  const avg = useMemo(() => {
    if (!reviews.length) return 0;
    return Math.round(reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length * 10) / 10;
  }, [reviews]);

  return (
    <div className="space-y-6">
      <Card className="bg-glass border-glass backdrop-blur-md">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-foreground">Customer Reviews</CardTitle>
          {reviews.length > 0 && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star key={s} className={`h-4 w-4 ${s <= Math.round(avg) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
              ))}
              <span className="ml-1 text-sm text-muted-foreground">{avg}</span>
            </div>
          )}
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />
              ))}
            </div>
          ) : reviews.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No reviews yet.</p>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-4">Total: {reviews.length} review{reviews.length !== 1 ? 's' : ''}</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Rating</TableHead>
                    <TableHead>Comment</TableHead>
                    <TableHead>Channel</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="flex gap-0.5">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} className={`h-3.5 w-3.5 ${s <= r.rating ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`} />
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.comment || '—'}</TableCell>
                      <TableCell>{r.channel || r.origin || '—'}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(r.created_at).toLocaleDateString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </>
          )}
        </CardContent>
      </Card>
    </div>);

};

export default ReviewsDashboard;