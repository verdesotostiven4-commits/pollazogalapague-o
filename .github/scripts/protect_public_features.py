from pathlib import Path
root=Path('.')

def between(t,a,b,new):
 i=t.index(a); j=t.index(b,i); return t[:i]+new+t[j:]

p=root/'src/components/Testimonials.tsx'; t=p.read_text()
t=t.replace("import { supabase, isSupabaseConfigured } from '../lib/supabase';\n",'')
start=t.find('interface CustomerReviewRow {')
if start>=0:
 end=t.index('\n}\n',start)+3
 t=t[:start]+t[end:]
new_check=r'''  const checkReviewStatus = useCallback(async () => {
    if (!customerPhone) {
      setHasReviewed(false);
      return;
    }

    if (readLocalReviewed()) {
      setHasReviewed(true);
    }

    try {
      const response = await fetch('/api/testimonials', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        hasReviewed?: boolean;
      };

      if (response.ok && result.ok && result.hasReviewed) {
        setHasReviewed(true);
        markLocalReviewed();
      }
    } catch {
      // La interfaz mantiene el estado local; el servidor decide al publicar.
    }
  }, [customerPhone, markLocalReviewed, readLocalReviewed]);
'''
t=between(t,'  const checkReviewStatus = useCallback(async () => {','\n  const fetchTestimonials = useCallback',new_check)
new_fetch=r'''  const fetchTestimonials = useCallback(async () => {
    try {
      const response = await fetch('/api/testimonials', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        testimonials?: Testimonial[];
        hasReviewed?: boolean;
      };

      if (response.ok && result.ok) {
        setTestimonials(Array.isArray(result.testimonials) ? result.testimonials : []);
        if (result.hasReviewed) {
          setHasReviewed(true);
          markLocalReviewed();
        }
      }
    } catch (error) {
      console.warn('No se pudieron cargar opiniones:', error);
    } finally {
      setLoading(false);
    }
  }, [markLocalReviewed]);
'''
t=between(t,'  const fetchTestimonials = useCallback(async () => {','\n  useEffect(() => {\n    checkReviewStatus();',new_fetch)
start=t.find('  const findCustomerForReview = useCallback')
if start>=0:
 end=t.index('\n  const playRewardSound',start)
 t=t[:start]+t[end:]
new_submit=r'''  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim() || !comment.trim()) {
      setError('Completa tu nombre y comentario.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const response = await fetch('/api/testimonials', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          authorName: name.trim(),
          stars,
          comment: comment.trim(),
          photoUrl: photoUrl.trim() || null,
        }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        awardedPoints?: number;
        hasReviewed?: boolean;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'No se pudo publicar tu opinión.');
      }

      const awardedPoints = Number(result.awardedPoints || 0) > 0;
      if (result.hasReviewed) {
        markLocalReviewed();
        setHasReviewed(true);
      }

      setPointsGainedNow(awardedPoints);
      if (awardedPoints) playRewardSound();
      setSuccess(true);
      setComment('');
      await fetchTestimonials();

      window.setTimeout(() => {
        setSuccess(false);
        setPointsGainedNow(false);
        setShowForm(false);
      }, awardedPoints ? 9000 : 4500);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo publicar tu opinión.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch('/api/testimonials', {
        method: 'DELETE',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
      };
      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'No se pudo borrar la opinión.');
      }
      setTestimonials(prev => prev.filter(testimonial => testimonial.id !== id));
    } catch (error) {
      setError(error instanceof Error ? error.message : 'No se pudo borrar la opinión.');
    }
  };
'''
t=between(t,'  const handleSubmit = async (e: React.FormEvent) => {','\n  const startHold = () => {',new_submit)
p.write_text(t)

p=root/'src/components/LiveMetrics.tsx'; t=p.read_text()
new_fetch=r'''  const fetchMetrics = useCallback(async (countVisit = false) => {
    try {
      const response = await fetch('/api/metrics', {
        method: countVisit ? 'POST' : 'GET',
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        totalVisits?: number;
        totalOrders?: number;
      };

      if (!response.ok || !result.ok) return;
      setTotalVisits(Number(result.totalVisits || 0));
      setTotalOrders(Number(result.totalOrders || 0));
    } catch (error) {
      console.warn('No se pudieron cargar métricas:', error);
    }
  }, []);
'''
t=between(t,'  const fetchMetrics = useCallback(async () => {','\n  useEffect(() => {\n    if (!isSupabaseConfigured) return;',new_fetch)
start=t.index('  useEffect(() => {\n    if (!isSupabaseConfigured) return;')
presence=t.index("  useEffect(() => {\n    if (!isSupabaseConfigured) {\n      setOnlineCount(1);",start)
new_effects=r'''  useEffect(() => {
    const alreadyCounted = sessionStorage.getItem(VISIT_COUNTED_KEY);
    if (!alreadyCounted) {
      sessionStorage.setItem(VISIT_COUNTED_KEY, '1');
      void fetchMetrics(true);
    } else {
      void fetchMetrics(false);
    }
  }, [fetchMetrics]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void fetchMetrics(false);
    }, 30000);
    return () => window.clearInterval(interval);
  }, [fetchMetrics]);

'''
t=t[:start]+new_effects+t[presence:]
p.write_text(t)

p=root/'src/utils/pushNotifications.ts'; t=p.read_text()
t=t.replace("import { supabase } from '../lib/supabase';\n\n",'')
old="""const deleteSubscriptionFromSupabase = async (endpoint: string) => {
  try {
    await supabase
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint);
  } catch (error) {
    console.warn('No se pudo borrar suscripción vieja desde cliente:', error);
  }
};
"""
new="""const deleteSubscriptionWithApi = async (endpoint: string) => {
  if (!endpoint) return;

  try {
    await fetch('/api/register-push', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', endpoint }),
    });
  } catch (error) {
    console.warn('No se pudo borrar la suscripción desde la API:', error);
  }
};
"""
assert old in t
t=t.replace(old,new).replace('deleteSubscriptionFromSupabase','deleteSubscriptionWithApi')
p.write_text(t)
