import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import webPush from 'web-push';

type ReminderKind = '3d' | '1d' | 'expired';

type MembershipRow = {
  id: string;
  customer_phone: string;
  customer_name?: string | null;
  plan_name?: string | null;
  status: string;
  expires_at?: string | null;
  reminder_3d_sent_at?: string | null;
  reminder_1d_sent_at?: string | null;
  reminder_expired_sent_at?: string | null;
};

type PushSubscriptionRow = {
  id: string;
  customer_phone: string;
  endpoint: string;
  subscription: any;
};

const DEFAULT_ICON = '/logo-final.png';
const PLUS_ICON = '/logo-final.png';

const MS_HOUR = 1000 * 60 * 60;
const MS_DAY = MS_HOUR * 24;

const cleanPhoneTail = (phone?: string | null) => {
  return String(phone || '').replace(/\D/g, '').slice(-9);
};

const getEnv = () => {
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL;

  const supabaseServiceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  const vapidPublicKey =
    process.env.VAPID_PUBLIC_KEY ||
    process.env.VITE_VAPID_PUBLIC_KEY;

  const vapidPrivateKey =
    process.env.VAPID_PRIVATE_KEY;

  const vapidSubject =
    process.env.VAPID_SUBJECT || 'mailto:admin@pollazo.app';

  const cronSecret = process.env.CRON_SECRET || '';

  return {
    supabaseUrl,
    supabaseServiceRoleKey,
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject,
    cronSecret,
  };
};

const isAuthorizedCron = (req: VercelRequest, cronSecret: string) => {
  if (!cronSecret) return true;

  const authHeader = String(req.headers.authorization || '');
  const querySecret =
    typeof req.query.secret === 'string'
      ? req.query.secret
      : '';

  return (
    authHeader === `Bearer ${cronSecret}` ||
    querySecret === cronSecret
  );
};

const getReminderKind = (
  membership: MembershipRow,
  nowMs: number
): ReminderKind | null => {
  if (!membership.expires_at) return null;

  const expiresMs = new Date(membership.expires_at).getTime();

  if (Number.isNaN(expiresMs)) return null;

  const diffMs = expiresMs - nowMs;
  const diffHours = diffMs / MS_HOUR;

  if (diffMs <= 0 && !membership.reminder_expired_sent_at) {
    return 'expired';
  }

  if (diffHours > 0 && diffHours <= 24 && !membership.reminder_1d_sent_at) {
    return '1d';
  }

  if (diffHours > 48 && diffHours <= 72 && !membership.reminder_3d_sent_at) {
    return '3d';
  }

  return null;
};

const buildReminderText = (
  membership: MembershipRow,
  kind: ReminderKind
) => {
  const name = membership.customer_name?.trim();
  const greeting = name ? `${name}, ` : '';

  if (kind === '3d') {
    return {
      title: '👑 Tu Pollazo Plus vence pronto',
      body: `${greeting}tu membresía vence en 3 días. Renueva para mantener delivery gratis.`,
    };
  }

  if (kind === '1d') {
    return {
      title: '⚠️ Pollazo Plus vence mañana',
      body: `${greeting}renueva tu Plus para no perder tus beneficios y delivery gratis.`,
    };
  }

  return {
    title: '👑 Tu Pollazo Plus venció',
    body: `${greeting}tu membresía terminó. Puedes renovarla para volver a tener delivery gratis.`,
  };
};

const getReminderColumn = (kind: ReminderKind) => {
  if (kind === '3d') return 'reminder_3d_sent_at';
  if (kind === '1d') return 'reminder_1d_sent_at';
  return 'reminder_expired_sent_at';
};

const buildNotificationPayload = (
  membership: MembershipRow,
  kind: ReminderKind
) => {
  const text = buildReminderText(membership, kind);

  return JSON.stringify({
    title: text.title,
    body: text.body,
    url: '/?plus=1',
    icon: PLUS_ICON,
    badge: PLUS_ICON,
    tag: `pollazo-plus-${kind}-${membership.id}`,
    orderCode: null,
    status: null,
    paymentStatus: null,
    membershipId: membership.id,
    membershipReminder: kind,
  });
};

const sendPushToCustomer = async ({
  subscriptions,
  membership,
  kind,
}: {
  subscriptions: PushSubscriptionRow[];
  membership: MembershipRow;
  kind: ReminderKind;
}) => {
  const customerTail = cleanPhoneTail(membership.customer_phone);

  const customerSubscriptions = subscriptions.filter(row => {
    return cleanPhoneTail(row.customer_phone) === customerTail;
  });

  if (customerSubscriptions.length === 0) {
    return {
      sent: 0,
      failed: 0,
      expiredSubscriptionIds: [] as string[],
      noSubscription: true,
    };
  }

  const notificationPayload = buildNotificationPayload(membership, kind);

  let sent = 0;
  let failed = 0;
  const expiredSubscriptionIds: string[] = [];

  await Promise.all(
    customerSubscriptions.map(async row => {
      try {
        await webPush.sendNotification(
          row.subscription,
          notificationPayload
        );

        sent += 1;
      } catch (error: any) {
        failed += 1;

        const statusCode = error?.statusCode;

        if (statusCode === 404 || statusCode === 410) {
          expiredSubscriptionIds.push(row.id);
        }

        console.error('Membership reminder push error:', {
          membershipId: membership.id,
          customerPhone: membership.customer_phone,
          kind,
          statusCode,
          body: error?.body,
        });
      }
    })
  );

  return {
    sent,
    failed,
    expiredSubscriptionIds,
    noSubscription: false,
  };
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      error: 'Method not allowed',
    });
  }

  const {
    supabaseUrl,
    supabaseServiceRoleKey,
    vapidPublicKey,
    vapidPrivateKey,
    vapidSubject,
    cronSecret,
  } = getEnv();

  if (!isAuthorizedCron(req, cronSecret)) {
    return res.status(401).json({
      ok: false,
      error: 'Unauthorized cron request',
    });
  }

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    return res.status(500).json({
      ok: false,
      error: 'Missing Supabase server env vars',
    });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return res.status(500).json({
      ok: false,
      error: 'Missing VAPID env vars',
    });
  }

  webPush.setVapidDetails(
    vapidSubject,
    vapidPublicKey,
    vapidPrivateKey
  );

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
    },
  });

  const now = new Date();
  const nowIso = now.toISOString();
  const nowMs = now.getTime();
  const upperLimitIso = new Date(nowMs + MS_DAY * 4).toISOString();

  const dryRun =
    req.query.dry === '1' ||
    req.query.dry === 'true';

  const { data: membershipsData, error: membershipsError } = await supabase
    .from('customer_memberships')
    .select(
      [
        'id',
        'customer_phone',
        'customer_name',
        'plan_name',
        'status',
        'expires_at',
        'reminder_3d_sent_at',
        'reminder_1d_sent_at',
        'reminder_expired_sent_at',
      ].join(', ')
    )
    .eq('status', 'active')
    .not('expires_at', 'is', null)
    .lte('expires_at', upperLimitIso)
    .order('expires_at', { ascending: true });

  if (membershipsError) {
    console.error('Error reading memberships:', membershipsError);

    return res.status(500).json({
      ok: false,
      error: 'Could not read memberships',
    });
  }

  const memberships = (membershipsData || []) as MembershipRow[];

  const reminders = memberships
    .map(membership => ({
      membership,
      kind: getReminderKind(membership, nowMs),
    }))
    .filter((item): item is { membership: MembershipRow; kind: ReminderKind } => {
      return Boolean(item.kind);
    });

  if (reminders.length === 0) {
    return res.status(200).json({
      ok: true,
      dryRun,
      checked: memberships.length,
      reminders: 0,
      sent: 0,
      failed: 0,
      expiredDeleted: 0,
      message: 'No membership reminders to send',
    });
  }

  const { data: subscriptionsData, error: subscriptionsError } = await supabase
    .from('push_subscriptions')
    .select('id, customer_phone, endpoint, subscription')
    .order('created_at', { ascending: false });

  if (subscriptionsError) {
    console.error('Error reading push subscriptions:', subscriptionsError);

    return res.status(500).json({
      ok: false,
      error: 'Could not read push subscriptions',
    });
  }

  const subscriptions = (subscriptionsData || []) as PushSubscriptionRow[];

  let totalSent = 0;
  let totalFailed = 0;
  let totalNoSubscription = 0;
  const expiredSubscriptionIds: string[] = [];
  const processed: Array<{
    membershipId: string;
    customerPhone: string;
    kind: ReminderKind;
    sent: number;
    failed: number;
    noSubscription: boolean;
    updated: boolean;
  }> = [];

  for (const reminder of reminders) {
    const { membership, kind } = reminder;

    if (dryRun) {
      processed.push({
        membershipId: membership.id,
        customerPhone: membership.customer_phone,
        kind,
        sent: 0,
        failed: 0,
        noSubscription: false,
        updated: false,
      });

      continue;
    }

    const pushResult = await sendPushToCustomer({
      subscriptions,
      membership,
      kind,
    });

    totalSent += pushResult.sent;
    totalFailed += pushResult.failed;

    if (pushResult.noSubscription) {
      totalNoSubscription += 1;
    }

    expiredSubscriptionIds.push(...pushResult.expiredSubscriptionIds);

    const reminderColumn = getReminderColumn(kind);
    const shouldMarkReminder =
      pushResult.sent > 0 ||
      kind === 'expired';

    let updated = false;

    if (shouldMarkReminder) {
      const patch: Record<string, unknown> = {
        [reminderColumn]: nowIso,
        updated_at: nowIso,
      };

      if (kind === 'expired') {
        patch.status = 'expired';
      }

      const { error: updateError } = await supabase
        .from('customer_memberships')
        .update(patch)
        .eq('id', membership.id);

      if (updateError) {
        console.error('Error updating membership reminder field:', {
          membershipId: membership.id,
          kind,
          error: updateError,
        });
      } else {
        updated = true;
      }

      if (kind === 'expired') {
        const { error: customerUpdateError } = await supabase
          .from('customers')
          .update({
            membership_status: 'expired',
            membership_plan: membership.plan_name || 'Pollazo Plus',
            membership_updated_at: nowIso,
            updated_at: nowIso,
          })
          .eq('phone', membership.customer_phone);

        if (customerUpdateError) {
          console.warn('Could not update customer expired Plus status:', {
            customerPhone: membership.customer_phone,
            error: customerUpdateError,
          });
        }
      }
    }

    processed.push({
      membershipId: membership.id,
      customerPhone: membership.customer_phone,
      kind,
      sent: pushResult.sent,
      failed: pushResult.failed,
      noSubscription: pushResult.noSubscription,
      updated,
    });
  }

  if (!dryRun && expiredSubscriptionIds.length > 0) {
    await supabase
      .from('push_subscriptions')
      .delete()
      .in('id', expiredSubscriptionIds);
  }

  return res.status(200).json({
    ok: true,
    dryRun,
    checked: memberships.length,
    reminders: reminders.length,
    sent: totalSent,
    failed: totalFailed,
    noSubscription: totalNoSubscription,
    expiredDeleted: dryRun ? 0 : expiredSubscriptionIds.length,
    processed,
  });
}
