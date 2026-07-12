from pathlib import Path

path = Path('src/components/Testimonials.tsx')
source = path.read_text(encoding='utf-8')
source = source.replace("import { supabase } from '../lib/supabase';\n", '', 1)

old = """  const fetchTestimonials = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const response = await fetch('/api/testimonials', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        testimonials?: Testimonial[];
        hasReviewed?: boolean;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'La API de opiniones no respondió.');
      }

      setTestimonials(Array.isArray(result.testimonials) ? result.testimonials : []);
      if (result.hasReviewed) {
        setHasReviewed(true);
        markLocalReviewed();
      }
      return;
    } catch (apiError) {
      console.warn('API de opiniones no disponible; usando lectura pública:', apiError);
    }

    try {
      const direct = await supabase
        .from('testimonials')
        .select('id,author_name,stars,comment,photo_url,created_at')
        .order('created_at', { ascending: false })
        .limit(50);

      if (direct.error) throw direct.error;
      setTestimonials((direct.data || []) as Testimonial[]);
    } catch (directError) {
      console.warn('No se pudieron cargar opiniones:', directError);
      setTestimonials([]);
      setLoadError('No pudimos conectar con las opiniones. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  }, [markLocalReviewed]);"""

new = """  const fetchTestimonials = useCallback(async () => {
    setLoading(true);
    setLoadError('');

    try {
      const response = await fetch('/api/testimonials', {
        credentials: 'same-origin',
        cache: 'no-store',
      });
      const result = (await response.json().catch(() => ({}))) as {
        ok?: boolean;
        error?: string;
        testimonials?: Testimonial[];
        hasReviewed?: boolean;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.error || 'La API de opiniones no respondió.');
      }

      setTestimonials(Array.isArray(result.testimonials) ? result.testimonials : []);
      if (result.hasReviewed) {
        setHasReviewed(true);
        markLocalReviewed();
      }
    } catch (apiError) {
      console.warn('No se pudieron cargar opiniones:', apiError);
      setTestimonials([]);
      setLoadError(
        apiError instanceof Error
          ? apiError.message
          : 'No pudimos conectar con las opiniones. Intenta nuevamente.'
      );
    } finally {
      setLoading(false);
    }
  }, [markLocalReviewed]);"""

if old not in source:
    raise RuntimeError('No se encontró el cargador temporal de opiniones')

path.write_text(source.replace(old, new, 1), encoding='utf-8')
print('Opiniones conservadas detrás de la API segura.')
