import { createClient } from '@supabase/supabase-js';
import {
  getCustomerSessionSecret,
  readCustomerSessionToken,
  verifyCustomerSessionToken,
} from '../customer-session.js';
import {
  getPanelSessionSecret,
  readPanelSessionToken,
  verifyPanelSessionToken,
} from '../panel-session.js';

type ApiRequest = {
  method?: string;
  body?: unknown;
  headers?: Record<string, string | string[] | undefined>;
};

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => void };
  setHeader: (name: string, value: string | string[]) => void;
};

type Body = {
  id?: string;
  authorName?: string;
  stars?: number;
  comment?: string;
  photoUrl?: string | null;
};

const getBody = (req: ApiRequest): Body => {
  if (!req.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Body;
    } catch {
      return {};
    }
  }
  return typeof req.body === 'object' ? (req.body as Body) : {};
};

const cleanText = (value: unknown, max: number) =>
  String(value || '').trim().replace(/\s+/g, ' ').slice(0, max);

const getClient = () => {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

export default async function handler(req: ApiRequest, res: ApiResponse) {
  res.setHeader('Cache-Control', req.method === 'GET' ? 'public, max-age=15, stale-while-revalidate=45' : 'no-store');

  const supabase = getClient();
  if (!supabase) {
    return res.status(500).json({ ok: false, error: 'Missing server database configuration' });
  }

  if (req.method === 'GET') {
    const testimonials = await supabase
      .from('testimonials')
      .select('id,author_name,stars,comment,photo_url,created_at')
      .order('created_at', { ascending: false })
      .limit(50);

    if (testimonials.error) {
      console.error('Testimonials load failed:', testimonials.error);
      return res.status(500).json({ ok: false, error: 'Could not load testimonials' });
    }

    let hasReviewed = false;
    const customerSecret = getCustomerSessionSecret();
    if (customerSecret) {
      const token = readCustomerSessionToken(req.headers);
      const claims = await verifyCustomerSessionToken(token, customerSecret);
      if (claims) {
        const customer = await supabase
          .from('customers')
          .select('has_reviewed')
          .eq('phone', claims.phone)
          .maybeSingle();
        hasReviewed = customer.data?.has_reviewed === true;
      }
    }

    return res.status(200).json({
      ok: true,
      testimonials: testimonials.data || [],
      hasReviewed,
    });
  }

  if (req.method === 'POST') {
    const customerSecret = getCustomerSessionSecret();
    if (!customerSecret) {
      return res.status(500).json({ ok: false, error: 'Missing customer session configuration' });
    }

    const token = readCustomerSessionToken(req.headers);
    const claims = await verifyCustomerSessionToken(token, customerSecret);
    if (!claims) {
      return res.status(401).json({ ok: false, error: 'Inicia sesión para publicar una opinión.' });
    }

    const body = getBody(req);
    const authorName = cleanText(body.authorName, 100);
    const comment = cleanText(body.comment, 1500);
    const photoUrl = cleanText(body.photoUrl, 1000) || null;
    const stars = Math.floor(Number(body.stars));

    if (!authorName || comment.length < 3 || stars < 1 || stars > 5) {
      return res.status(400).json({ ok: false, error: 'Opinión inválida.' });
    }

    const result = await supabase.rpc('submit_customer_testimonial_v1', {
      p_customer_phone: claims.phone,
      p_author_name: authorName,
      p_stars: stars,
      p_comment: comment,
      p_photo_url: photoUrl,
    });

    if (result.error) {
      console.error('Testimonial submission failed:', result.error);
      const duplicate = /ya publicó|duplicate|unique/i.test(result.error.message || '');
      return res.status(duplicate ? 409 : 400).json({
        ok: false,
        error: duplicate
          ? 'Ya publicaste una opinión con esta cuenta.'
          : result.error.message || 'No se pudo publicar la opinión.',
      });
    }

    return res.status(201).json({
      ok: true,
      testimonial: result.data?.testimonial || null,
      awardedPoints: Number(result.data?.awarded_points || 0),
      hasReviewed: result.data?.has_reviewed === true,
    });
  }

  if (req.method === 'DELETE') {
    const panelSecret = getPanelSessionSecret();
    if (!panelSecret) {
      return res.status(500).json({ ok: false, error: 'Missing panel session configuration' });
    }

    const panelToken = readPanelSessionToken(req.headers, 'admin');
    const admin = await verifyPanelSessionToken(panelToken, 'admin', panelSecret);
    if (!admin) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }

    const id = cleanText(getBody(req).id, 100);
    if (!id) return res.status(400).json({ ok: false, error: 'Missing testimonial id' });

    const deleted = await supabase.from('testimonials').delete().eq('id', id);
    if (deleted.error) {
      console.error('Testimonial delete failed:', deleted.error);
      return res.status(500).json({ ok: false, error: 'Could not delete testimonial' });
    }

    return res.status(200).json({ ok: true, id });
  }

  return res.status(405).json({ ok: false, error: 'Method not allowed' });
}
