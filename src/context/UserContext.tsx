import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import type {
  CustomerMembership,
  DeliveryAddress,
  DeliveryAddressLabel,
  MembershipStatus,
} from '../types';

interface SetUserDataInput {
  phone?: string;
  name?: string;
  avatar?: string;
  lat?: number | null;
  lng?: number | null;
  reference?: string;
  points?: number;
  exp?: number;
  isVip?: boolean;
  phoneVerified?: boolean;
  deliveryAddresses?: DeliveryAddress[];
  selectedDeliveryAddressId?: string | null;

  membershipStatus?: MembershipStatus | null;
  membershipPlan?: string | null;
  membershipStartedAt?: string | null;
  membershipExpiresAt?: string | null;
  membershipUpdatedAt?: string | null;
}

interface SaveDeliveryAddressInput {
  id?: string;
  label: DeliveryAddressLabel;
  lat: number;
  lng: number;
  reference: string;
  isDefault?: boolean;
}

interface UserContextType {
  customerPhone: string;
  customerName: string;
  customerAvatar: string;
  customerLat: number | null;
  customerLng: number | null;
  customerReference: string;
  customerPoints: number;
  customerExp: number;
  isVip: boolean;
  phoneVerified: boolean;
  isLoggedIn: boolean;
  hasDeliveryLocation: boolean;
  phoneDisplay: string;

  membershipStatus: MembershipStatus;
  membershipPlan: string;
  membershipStartedAt: string | null;
  membershipExpiresAt: string | null;
  membershipUpdatedAt: string | null;
  activeMembership: CustomerMembership | null;
  hasPollazoPlus: boolean;
  pollazoPlusExpiresAt: string | null;
  refreshMembership: () => Promise<void>;

  deliveryAddresses: DeliveryAddress[];
  selectedDeliveryAddressId: string | null;
  selectedDeliveryAddress: DeliveryAddress | null;

  setUserData: (data: SetUserDataInput) => void;
  saveDeliveryAddress: (data: SaveDeliveryAddressInput) => DeliveryAddress | null;
  selectDeliveryAddress: (addressId: string) => void;
  deleteDeliveryAddress: (addressId: string) => void;
  logout: () => void;
}

interface CustomerSyncRow {
  phone?: string | null;
  name?: string | null;
  avatar_url?: string | null;
  points?: number | null;
  exp?: number | null;
  is_vip?: boolean | null;
  phone_verified?: boolean | null;
  lat?: number | null;
  lng?: number | null;
  reference?: string | null;
  delivery_addresses?: DeliveryAddress[] | null;
  selected_delivery_address_id?: string | null;

  membership_status?: MembershipStatus | null;
  membership_plan?: string | null;
  membership_started_at?: string | null;
  membership_expires_at?: string | null;
  membership_updated_at?: string | null;
}

const STORAGE_KEYS = {
  phone: 'pollazo_customer_phone',
  name: 'pollazo_customer_name',
  avatar: 'pollazo_customer_avatar',
  lat: 'pollazo_customer_lat',
  lng: 'pollazo_customer_lng',
  reference: 'pollazo_customer_reference',
  points: 'pollazo_customer_points',
  exp: 'pollazo_customer_exp',
  isVip: 'pollazo_customer_is_vip',
  phoneVerified: 'pollazo_customer_phone_verified',
  deliveryAddresses: 'pollazo_customer_delivery_addresses',
  selectedDeliveryAddressId: 'pollazo_customer_selected_delivery_address_id',

  membershipStatus: 'pollazo_customer_membership_status',
  membershipPlan: 'pollazo_customer_membership_plan',
  membershipStartedAt: 'pollazo_customer_membership_started_at',
  membershipExpiresAt: 'pollazo_customer_membership_expires_at',
  membershipUpdatedAt: 'pollazo_customer_membership_updated_at',
};

const UserContext = createContext<UserContextType | undefined>(undefined);

const cleanDigits = (value: string) => value.replace(/\D/g, '');

const normalizeEcuadorPhone = (phone: string): string => {
  const digits = cleanDigits(phone);

  if (!digits) return '';

  if (digits.startsWith('593') && digits.length >= 11) {
    return digits;
  }

  if (digits.startsWith('0') && digits.length === 10) {
    return `593${digits.slice(1)}`;
  }

  if (digits.startsWith('9') && digits.length === 9) {
    return `593${digits}`;
  }

  return digits;
};

const formatPhoneForUser = (phone: string): string => {
  const digits = cleanDigits(phone);

  if (digits.startsWith('593') && digits.length >= 11) {
    return `0${digits.slice(3)}`;
  }

  return digits;
};

const parseStoredNumber = (value: string | null): number | null => {
  if (value === null || value.trim() === '') return null;

  const parsed = Number.parseFloat(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const parseStoredInteger = (value: string | null): number => {
  if (value === null || value.trim() === '') return 0;

  const parsed = Number.parseInt(value, 10);

  return Number.isFinite(parsed) ? parsed : 0;
};

const parseStoredBoolean = (value: string | null): boolean => {
  return value === 'true';
};

const parseStoredMembershipStatus = (value: string | null): MembershipStatus => {
  if (
    value === 'pending' ||
    value === 'active' ||
    value === 'expired' ||
    value === 'cancelled'
  ) {
    return value;
  }

  return 'none';
};

const persistText = (key: string, value: string) => {
  const cleanValue = value.trim();

  if (cleanValue) {
    localStorage.setItem(key, cleanValue);
  } else {
    localStorage.removeItem(key);
  }
};

const persistNullableText = (key: string, value?: string | null) => {
  if (value && value.trim()) {
    localStorage.setItem(key, value.trim());
  } else {
    localStorage.removeItem(key);
  }
};

const persistNumber = (key: string, value: number | null) => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    localStorage.setItem(key, value.toString());
  } else {
    localStorage.removeItem(key);
  }
};

const persistInteger = (key: string, value: number | null | undefined) => {
  const safeValue =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(0, Math.floor(value))
      : 0;

  localStorage.setItem(key, safeValue.toString());

  return safeValue;
};

const persistBoolean = (key: string, value: boolean) => {
  localStorage.setItem(key, value.toString());
};

const persistMembershipStatus = (status: MembershipStatus) => {
  if (status && status !== 'none') {
    localStorage.setItem(STORAGE_KEYS.membershipStatus, status);
  } else {
    localStorage.removeItem(STORAGE_KEYS.membershipStatus);
  }
};

const persistDeliveryAddresses = (addresses: DeliveryAddress[]) => {
  if (addresses.length > 0) {
    localStorage.setItem(STORAGE_KEYS.deliveryAddresses, JSON.stringify(addresses));
  } else {
    localStorage.removeItem(STORAGE_KEYS.deliveryAddresses);
  }
};

const isValidCoordinate = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const isDeliveryAddressLabel = (value: unknown): value is DeliveryAddressLabel => {
  return value === 'Casa' || value === 'Trabajo' || value === 'Airbnb' || value === 'Otro';
};

const isMembershipActive = (membership?: CustomerMembership | null) => {
  if (!membership || membership.status !== 'active') return false;

  if (!membership.expires_at) return true;

  return new Date(membership.expires_at).getTime() > Date.now();
};

const makeAddressId = (label: DeliveryAddressLabel) => {
  const safeLabel = label.toLowerCase().replace(/\s+/g, '-');
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

  return `addr-${safeLabel}-${random}`;
};

const normalizeDeliveryAddress = (
  input: SaveDeliveryAddressInput | DeliveryAddress
): DeliveryAddress | null => {
  if (!isDeliveryAddressLabel(input.label)) return null;
  if (!isValidCoordinate(input.lat) || !isValidCoordinate(input.lng)) return null;

  const reference = String(input.reference || '').trim();

  if (!reference) return null;

  const now = new Date().toISOString();

  return {
    id: input.id || makeAddressId(input.label),
    label: input.label,
    lat: input.lat,
    lng: input.lng,
    reference,
    is_default:
      'is_default' in input
        ? Boolean(input.is_default)
        : 'isDefault' in input
          ? Boolean(input.isDefault)
          : false,
    created_at:
      'created_at' in input && input.created_at
        ? input.created_at
        : now,
    updated_at:
      'updated_at' in input && input.updated_at
        ? input.updated_at
        : now,
  };
};

const parseStoredDeliveryAddresses = (value: string | null): DeliveryAddress[] => {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);

    if (!Array.isArray(parsed)) return [];

    return parsed
      .map(item =>
        normalizeDeliveryAddress({
          id: item?.id,
          label: item?.label,
          lat: item?.lat,
          lng: item?.lng,
          reference: item?.reference,
          isDefault: item?.is_default,
          created_at: item?.created_at,
          updated_at: item?.updated_at,
        } as DeliveryAddress)
      )
      .filter((item): item is DeliveryAddress => Boolean(item));
  } catch {
    return [];
  }
};

const normalizeDeliveryAddressList = (value: unknown): DeliveryAddress[] => {
  if (!Array.isArray(value)) return [];

  return value
    .map(item =>
      normalizeDeliveryAddress({
        id: item?.id,
        label: item?.label,
        lat: item?.lat,
        lng: item?.lng,
        reference: item?.reference,
        isDefault: item?.is_default,
        created_at: item?.created_at,
        updated_at: item?.updated_at,
      } as DeliveryAddress)
    )
    .filter((item): item is DeliveryAddress => Boolean(item));
};

const mergeDeliveryAddressLists = (
  currentAddresses: DeliveryAddress[],
  incomingAddresses: DeliveryAddress[]
): DeliveryAddress[] => {
  const map = new Map<string, DeliveryAddress>();

  currentAddresses.forEach(address => {
    map.set(address.id, address);
  });

  incomingAddresses.forEach(address => {
    map.set(address.id, {
      ...map.get(address.id),
      ...address,
    });
  });

  return Array.from(map.values())
    .filter(address => address.reference.trim().length > 0)
    .slice(0, 6);
};

const getStoredSelectedAddressId = () => {
  return localStorage.getItem(STORAGE_KEYS.selectedDeliveryAddressId) || null;
};

const getSelectedAddressId = (
  addresses: DeliveryAddress[],
  requestedId?: string | null
): string | null => {
  if (requestedId && addresses.some(address => address.id === requestedId)) {
    return requestedId;
  }

  const defaultAddress = addresses.find(address => address.is_default);

  if (defaultAddress) {
    return defaultAddress.id;
  }

  return addresses[0]?.id || null;
};

export function UserProvider({ children }: { children: ReactNode }) {
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerAvatar, setCustomerAvatar] = useState('');
  const [customerLat, setCustomerLat] = useState<number | null>(null);
  const [customerLng, setCustomerLng] = useState<number | null>(null);
  const [customerReference, setCustomerReference] = useState('');
  const [customerPoints, setCustomerPoints] = useState(0);
  const [customerExp, setCustomerExp] = useState(0);
  const [isVip, setIsVip] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [deliveryAddresses, setDeliveryAddresses] = useState<DeliveryAddress[]>([]);
  const [selectedDeliveryAddressId, setSelectedDeliveryAddressId] = useState<string | null>(null);

  const [membershipStatus, setMembershipStatus] = useState<MembershipStatus>('none');
  const [membershipPlan, setMembershipPlan] = useState('');
  const [membershipStartedAt, setMembershipStartedAt] = useState<string | null>(null);
  const [membershipExpiresAt, setMembershipExpiresAt] = useState<string | null>(null);
  const [membershipUpdatedAt, setMembershipUpdatedAt] = useState<string | null>(null);
  const [activeMembership, setActiveMembership] = useState<CustomerMembership | null>(null);

  const applyMembershipState = useCallback(
    (input: {
      status?: MembershipStatus | null;
      plan?: string | null;
      startedAt?: string | null;
      expiresAt?: string | null;
      updatedAt?: string | null;
      active?: CustomerMembership | null;
    }) => {
      const nextStatus = input.status || 'none';
      const nextPlan = input.plan || '';
      const nextStartedAt = input.startedAt || null;
      const nextExpiresAt = input.expiresAt || null;
      const nextUpdatedAt = input.updatedAt || null;

      setMembershipStatus(nextStatus);
      setMembershipPlan(nextPlan);
      setMembershipStartedAt(nextStartedAt);
      setMembershipExpiresAt(nextExpiresAt);
      setMembershipUpdatedAt(nextUpdatedAt);
      setActiveMembership(input.active || null);

      persistMembershipStatus(nextStatus);
      persistText(STORAGE_KEYS.membershipPlan, nextPlan);
      persistNullableText(STORAGE_KEYS.membershipStartedAt, nextStartedAt);
      persistNullableText(STORAGE_KEYS.membershipExpiresAt, nextExpiresAt);
      persistNullableText(STORAGE_KEYS.membershipUpdatedAt, nextUpdatedAt);

      const active = nextStatus === 'active' && (!nextExpiresAt || new Date(nextExpiresAt).getTime() > Date.now());

      if (active) {
        setIsVip(true);
        persistBoolean(STORAGE_KEYS.isVip, true);
      }
    },
    []
  );

  const refreshMembership = useCallback(async () => {
    const normalizedPhone = normalizeEcuadorPhone(customerPhone);

    if (!isSupabaseConfigured || !normalizedPhone) return;

    const { data, error } = await supabase
      .from('customer_memberships')
      .select('*')
      .eq('customer_phone', normalizedPhone)
      .in('status', ['active', 'pending', 'expired', 'cancelled'])
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('No se pudo cargar membresía Pollazo Plus:', error);
      return;
    }

    const memberships = (data || []) as CustomerMembership[];
    const active = memberships.find(item => isMembershipActive(item)) || null;
    const pending = memberships.find(item => item.status === 'pending') || null;
    const latest = active || pending || memberships[0] || null;

    if (!latest) {
      applyMembershipState({
        status: 'none',
        plan: '',
        startedAt: null,
        expiresAt: null,
        updatedAt: null,
        active: null,
      });
      return;
    }

    applyMembershipState({
      status: active ? 'active' : latest.status,
      plan: latest.plan_name || 'Pollazo Plus',
      startedAt: latest.started_at || null,
      expiresAt: latest.expires_at || null,
      updatedAt: latest.updated_at || latest.created_at || null,
      active,
    });
  }, [applyMembershipState, customerPhone]);

  const applyDeliveryAddresses = useCallback(
    (addresses: DeliveryAddress[], selectedId?: string | null) => {
      const normalized = normalizeDeliveryAddressList(addresses);
      const nextSelectedId = getSelectedAddressId(normalized, selectedId);
      const selectedAddress =
        normalized.find(address => address.id === nextSelectedId) || null;

      const nextAddresses = normalized.map(address => ({
        ...address,
        is_default: address.id === nextSelectedId,
      }));

      setDeliveryAddresses(nextAddresses);
      setSelectedDeliveryAddressId(nextSelectedId);

      persistDeliveryAddresses(nextAddresses);
      persistText(STORAGE_KEYS.selectedDeliveryAddressId, nextSelectedId || '');

      if (selectedAddress) {
        setCustomerLat(selectedAddress.lat);
        setCustomerLng(selectedAddress.lng);
        setCustomerReference(selectedAddress.reference);

        persistNumber(STORAGE_KEYS.lat, selectedAddress.lat);
        persistNumber(STORAGE_KEYS.lng, selectedAddress.lng);
        persistText(STORAGE_KEYS.reference, selectedAddress.reference);
      }
    },
    []
  );

  const applyServerCustomer = useCallback(
    (customer: CustomerSyncRow | null) => {
      if (!customer) return;

      if (typeof customer.phone === 'string' && customer.phone.trim()) {
        const normalizedPhone = normalizeEcuadorPhone(customer.phone);
        setCustomerPhone(normalizedPhone);
        persistText(STORAGE_KEYS.phone, normalizedPhone);
      }

      if (typeof customer.name === 'string') {
        const nextName = customer.name || '';
        setCustomerName(nextName);
        persistText(STORAGE_KEYS.name, nextName);
      }

      if (typeof customer.avatar_url === 'string') {
        const nextAvatar = customer.avatar_url || '';
        setCustomerAvatar(nextAvatar);
        persistText(STORAGE_KEYS.avatar, nextAvatar);
      }

      if (typeof customer.points === 'number') {
        setCustomerPoints(persistInteger(STORAGE_KEYS.points, customer.points));
      }

      if (typeof customer.exp === 'number') {
        setCustomerExp(persistInteger(STORAGE_KEYS.exp, customer.exp));
      }

      if (typeof customer.is_vip === 'boolean') {
        setIsVip(customer.is_vip);
        persistBoolean(STORAGE_KEYS.isVip, customer.is_vip);
      }

      if (typeof customer.phone_verified === 'boolean') {
        setPhoneVerified(customer.phone_verified);
        persistBoolean(STORAGE_KEYS.phoneVerified, customer.phone_verified);
      }

      if ('membership_status' in customer) {
        applyMembershipState({
          status: customer.membership_status || 'none',
          plan: customer.membership_plan || '',
          startedAt: customer.membership_started_at || null,
          expiresAt: customer.membership_expires_at || null,
          updatedAt: customer.membership_updated_at || null,
          active: null,
        });
      }

      if ('lat' in customer) {
        const nextLat = isValidCoordinate(customer.lat) ? customer.lat : null;
        setCustomerLat(nextLat);
        persistNumber(STORAGE_KEYS.lat, nextLat);
      }

      if ('lng' in customer) {
        const nextLng = isValidCoordinate(customer.lng) ? customer.lng : null;
        setCustomerLng(nextLng);
        persistNumber(STORAGE_KEYS.lng, nextLng);
      }

      if ('reference' in customer) {
        const nextReference =
          typeof customer.reference === 'string'
            ? customer.reference
            : '';

        setCustomerReference(nextReference);
        persistText(STORAGE_KEYS.reference, nextReference);
      }

      if ('delivery_addresses' in customer) {
        const serverAddresses = normalizeDeliveryAddressList(customer.delivery_addresses || []);
        const localAddresses = parseStoredDeliveryAddresses(
          localStorage.getItem(STORAGE_KEYS.deliveryAddresses)
        );

        if (serverAddresses.length > 0) {
          const mergedAddresses = mergeDeliveryAddressLists(localAddresses, serverAddresses);

          applyDeliveryAddresses(
            mergedAddresses,
            customer.selected_delivery_address_id || getStoredSelectedAddressId()
          );

          return;
        }

        if (localAddresses.length > 0) {
          applyDeliveryAddresses(localAddresses, getStoredSelectedAddressId());
        }
      }
    },
    [applyDeliveryAddresses, applyMembershipState]
  );

  const fetchDeliveryAddressesFromSupabase = useCallback(
    async (phone: string) => {
      const normalizedPhone = normalizeEcuadorPhone(phone);

      if (!isSupabaseConfigured || !normalizedPhone) return;

      const { data, error } = await supabase
        .from('customers')
        .select('delivery_addresses, selected_delivery_address_id')
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (error) {
        console.warn(
          'Direcciones favoritas no disponibles todavía. Falta migración delivery_addresses:',
          error
        );
        return;
      }

      applyServerCustomer(data as CustomerSyncRow | null);
    },
    [applyServerCustomer]
  );

  const fetchCustomerFromSupabase = useCallback(
    async (phone: string) => {
      const normalizedPhone = normalizeEcuadorPhone(phone);

      if (!isSupabaseConfigured || !normalizedPhone) return;

      const { data, error } = await supabase
        .from('customers')
        .select(
          'phone, name, avatar_url, points, exp, is_vip, phone_verified, lat, lng, reference, membership_status, membership_plan, membership_started_at, membership_expires_at, membership_updated_at'
        )
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (error) {
        console.warn('No se pudo cargar cliente desde Supabase:', error);
        return;
      }

      applyServerCustomer(data as CustomerSyncRow | null);
      void fetchDeliveryAddressesFromSupabase(normalizedPhone);
      void refreshMembership();
    },
    [applyServerCustomer, fetchDeliveryAddressesFromSupabase, refreshMembership]
  );

  const syncCustomerToSupabase = useCallback(
    async (data: SetUserDataInput, normalizedPhone: string) => {
      if (!isSupabaseConfigured || !normalizedPhone) return;

      const payload: Record<string, unknown> = {
        phone: normalizedPhone,
        updated_at: new Date().toISOString(),
      };

      if (data.name !== undefined) {
        payload.name = data.name.trim() || null;
      }

      if (data.avatar !== undefined) {
        payload.avatar_url = data.avatar.trim() || null;
      }

      if (data.lat !== undefined) {
        payload.lat = isValidCoordinate(data.lat) ? data.lat : null;
      }

      if (data.lng !== undefined) {
        payload.lng = isValidCoordinate(data.lng) ? data.lng : null;
      }

      if (data.reference !== undefined) {
        payload.reference = data.reference.trim() || null;
      }

      if (data.points !== undefined) {
        payload.points = Math.max(0, Math.floor(data.points));
      }

      if (data.exp !== undefined) {
        payload.exp = Math.max(0, Math.floor(data.exp));
      }

      if (data.isVip !== undefined) {
        payload.is_vip = data.isVip;
      }

      if (data.phoneVerified !== undefined) {
        payload.phone_verified = data.phoneVerified;
      }

      if (data.membershipStatus !== undefined) {
        payload.membership_status = data.membershipStatus || 'none';
      }

      if (data.membershipPlan !== undefined) {
        payload.membership_plan = data.membershipPlan || null;
      }

      if (data.membershipStartedAt !== undefined) {
        payload.membership_started_at = data.membershipStartedAt || null;
      }

      if (data.membershipExpiresAt !== undefined) {
        payload.membership_expires_at = data.membershipExpiresAt || null;
      }

      if (data.membershipUpdatedAt !== undefined) {
        payload.membership_updated_at = data.membershipUpdatedAt || null;
      }

      const { data: savedCustomer, error } = await supabase
        .from('customers')
        .upsert(payload, { onConflict: 'phone' })
        .select(
          'phone, name, avatar_url, points, exp, is_vip, phone_verified, lat, lng, reference, membership_status, membership_plan, membership_started_at, membership_expires_at, membership_updated_at'
        )
        .maybeSingle();

      if (error) {
        console.warn('No se pudo sincronizar cliente en Supabase:', error);
        return;
      }

      applyServerCustomer(savedCustomer as CustomerSyncRow | null);
    },
    [applyServerCustomer]
  );

  const syncDeliveryAddressesToSupabase = useCallback(
    async (
      addresses: DeliveryAddress[],
      selectedId: string | null,
      normalizedPhone: string
    ) => {
      if (!isSupabaseConfigured || !normalizedPhone) return;

      const { error } = await supabase
        .from('customers')
        .upsert(
          {
            phone: normalizedPhone,
            delivery_addresses: addresses,
            selected_delivery_address_id: selectedId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'phone' }
        );

      if (error) {
        console.warn(
          'No se pudieron guardar direcciones favoritas en Supabase. Revisa migración delivery_addresses:',
          error
        );
      }
    },
    []
  );

  useEffect(() => {
    const storedPhone = localStorage.getItem(STORAGE_KEYS.phone);
    const normalizedPhone = normalizeEcuadorPhone(storedPhone || '');

    const storedName = localStorage.getItem(STORAGE_KEYS.name) || '';
    const storedAvatar = localStorage.getItem(STORAGE_KEYS.avatar) || '';
    const storedReference = localStorage.getItem(STORAGE_KEYS.reference) || '';
    const storedAddresses = parseStoredDeliveryAddresses(
      localStorage.getItem(STORAGE_KEYS.deliveryAddresses)
    );
    const storedSelectedAddressId =
      localStorage.getItem(STORAGE_KEYS.selectedDeliveryAddressId) || null;

    const storedLat = parseStoredNumber(localStorage.getItem(STORAGE_KEYS.lat));
    const storedLng = parseStoredNumber(localStorage.getItem(STORAGE_KEYS.lng));
    const storedPoints = parseStoredInteger(localStorage.getItem(STORAGE_KEYS.points));
    const storedExp = parseStoredInteger(localStorage.getItem(STORAGE_KEYS.exp));
    const storedVip = parseStoredBoolean(localStorage.getItem(STORAGE_KEYS.isVip));
    const storedPhoneVerified = parseStoredBoolean(
      localStorage.getItem(STORAGE_KEYS.phoneVerified)
    );

    const storedMembershipStatus = parseStoredMembershipStatus(
      localStorage.getItem(STORAGE_KEYS.membershipStatus)
    );
    const storedMembershipPlan = localStorage.getItem(STORAGE_KEYS.membershipPlan) || '';
    const storedMembershipStartedAt =
      localStorage.getItem(STORAGE_KEYS.membershipStartedAt) || null;
    const storedMembershipExpiresAt =
      localStorage.getItem(STORAGE_KEYS.membershipExpiresAt) || null;
    const storedMembershipUpdatedAt =
      localStorage.getItem(STORAGE_KEYS.membershipUpdatedAt) || null;

    if (normalizedPhone) {
      setCustomerPhone(normalizedPhone);
      localStorage.setItem(STORAGE_KEYS.phone, normalizedPhone);
      void fetchCustomerFromSupabase(normalizedPhone);
    }

    setCustomerName(storedName);
    setCustomerAvatar(storedAvatar);
    setCustomerLat(storedLat);
    setCustomerLng(storedLng);
    setCustomerReference(storedReference);
    setCustomerPoints(storedPoints);
    setCustomerExp(storedExp);
    setIsVip(storedVip);
    setPhoneVerified(storedPhoneVerified);

    applyMembershipState({
      status: storedMembershipStatus,
      plan: storedMembershipPlan,
      startedAt: storedMembershipStartedAt,
      expiresAt: storedMembershipExpiresAt,
      updatedAt: storedMembershipUpdatedAt,
      active: null,
    });

    applyDeliveryAddresses(storedAddresses, storedSelectedAddressId);
  }, [applyDeliveryAddresses, applyMembershipState, fetchCustomerFromSupabase]);

  useEffect(() => {
    if (!isSupabaseConfigured || !customerPhone) {
      return undefined;
    }

    const channel = supabase
      .channel(`pollazo_customer_${customerPhone}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customers' },
        payload => {
          const nextCustomer = payload.new as CustomerSyncRow | null;
          const nextPhone = normalizeEcuadorPhone(nextCustomer?.phone || '');

          if (nextPhone === customerPhone) {
            applyServerCustomer(nextCustomer);
            void refreshMembership();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'customer_memberships' },
        payload => {
          const nextMembership = payload.new as CustomerMembership | null;
          const nextPhone = normalizeEcuadorPhone(nextMembership?.customer_phone || '');

          if (nextPhone === customerPhone) {
            void refreshMembership();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applyServerCustomer, customerPhone, refreshMembership]);

  const setUserData = useCallback(
    (data: SetUserDataInput) => {
      const normalizedPhone = normalizeEcuadorPhone(data.phone ?? customerPhone);
      const name = (data.name ?? customerName).trim();
      const avatar = (data.avatar ?? customerAvatar).trim();
      const reference = data.reference?.trim() ?? customerReference;

      const samePhone = normalizedPhone && normalizedPhone === customerPhone;
      const nextPhoneVerified = data.phoneVerified ?? (samePhone ? phoneVerified : false);

      setCustomerPhone(normalizedPhone);
      setCustomerName(name);
      setCustomerAvatar(avatar);
      setPhoneVerified(nextPhoneVerified);

      persistText(STORAGE_KEYS.phone, normalizedPhone);
      persistText(STORAGE_KEYS.name, name);
      persistText(STORAGE_KEYS.avatar, avatar);
      persistBoolean(STORAGE_KEYS.phoneVerified, nextPhoneVerified);

      if (data.lat !== undefined) {
        const nextLat = isValidCoordinate(data.lat) ? data.lat : null;
        setCustomerLat(nextLat);
        persistNumber(STORAGE_KEYS.lat, nextLat);
      }

      if (data.lng !== undefined) {
        const nextLng = isValidCoordinate(data.lng) ? data.lng : null;
        setCustomerLng(nextLng);
        persistNumber(STORAGE_KEYS.lng, nextLng);
      }

      if (data.reference !== undefined) {
        setCustomerReference(reference);
        persistText(STORAGE_KEYS.reference, reference);
      }

      if (data.points !== undefined) {
        setCustomerPoints(persistInteger(STORAGE_KEYS.points, data.points));
      }

      if (data.exp !== undefined) {
        setCustomerExp(persistInteger(STORAGE_KEYS.exp, data.exp));
      }

      if (data.isVip !== undefined) {
        setIsVip(data.isVip);
        persistBoolean(STORAGE_KEYS.isVip, data.isVip);
      }

      if (
        data.membershipStatus !== undefined ||
        data.membershipPlan !== undefined ||
        data.membershipStartedAt !== undefined ||
        data.membershipExpiresAt !== undefined ||
        data.membershipUpdatedAt !== undefined
      ) {
        applyMembershipState({
          status: data.membershipStatus ?? membershipStatus,
          plan: data.membershipPlan ?? membershipPlan,
          startedAt: data.membershipStartedAt ?? membershipStartedAt,
          expiresAt: data.membershipExpiresAt ?? membershipExpiresAt,
          updatedAt: data.membershipUpdatedAt ?? membershipUpdatedAt,
          active: activeMembership,
        });
      }

      if (data.deliveryAddresses !== undefined) {
        const nextSelectedId =
          data.selectedDeliveryAddressId ?? selectedDeliveryAddressId;

        applyDeliveryAddresses(data.deliveryAddresses, nextSelectedId);
      }

      if (data.selectedDeliveryAddressId !== undefined && data.deliveryAddresses === undefined) {
        const nextSelectedId =
          data.selectedDeliveryAddressId &&
          deliveryAddresses.some(address => address.id === data.selectedDeliveryAddressId)
            ? data.selectedDeliveryAddressId
            : null;

        setSelectedDeliveryAddressId(nextSelectedId);
        persistText(STORAGE_KEYS.selectedDeliveryAddressId, nextSelectedId || '');
      }

      if (normalizedPhone) {
        void syncCustomerToSupabase(
          {
            ...data,
            phone: normalizedPhone,
            name,
            avatar,
            reference,
            phoneVerified: nextPhoneVerified,
          },
          normalizedPhone
        );

        if (data.deliveryAddresses !== undefined || data.selectedDeliveryAddressId !== undefined) {
          const nextAddresses = data.deliveryAddresses || deliveryAddresses;
          const nextSelectedId =
            data.selectedDeliveryAddressId !== undefined
              ? data.selectedDeliveryAddressId
              : selectedDeliveryAddressId;

          void syncDeliveryAddressesToSupabase(
            nextAddresses,
            nextSelectedId || null,
            normalizedPhone
          );
        }
      }
    },
    [
      activeMembership,
      applyDeliveryAddresses,
      applyMembershipState,
      customerAvatar,
      customerName,
      customerPhone,
      customerReference,
      deliveryAddresses,
      membershipExpiresAt,
      membershipPlan,
      membershipStartedAt,
      membershipStatus,
      membershipUpdatedAt,
      phoneVerified,
      selectedDeliveryAddressId,
      syncCustomerToSupabase,
      syncDeliveryAddressesToSupabase,
    ]
  );

  const saveDeliveryAddress = useCallback(
    (data: SaveDeliveryAddressInput): DeliveryAddress | null => {
      const normalizedPhone = normalizeEcuadorPhone(customerPhone);
      const address = normalizeDeliveryAddress(data);

      if (!address) return null;

      const storedAddresses = parseStoredDeliveryAddresses(
        localStorage.getItem(STORAGE_KEYS.deliveryAddresses)
      );

      const sourceAddresses = mergeDeliveryAddressLists(storedAddresses, deliveryAddresses);

      const nextAddressesBase = sourceAddresses.some(current => current.id === address.id)
        ? sourceAddresses.map(current => (current.id === address.id ? address : current))
        : [address, ...sourceAddresses];

      const nextAddresses = nextAddressesBase
        .map(current => ({
          ...current,
          is_default: current.id === address.id,
          updated_at: current.id === address.id ? new Date().toISOString() : current.updated_at,
        }))
        .slice(0, 6);

      setDeliveryAddresses(nextAddresses);
      setSelectedDeliveryAddressId(address.id);
      setCustomerLat(address.lat);
      setCustomerLng(address.lng);
      setCustomerReference(address.reference);

      persistDeliveryAddresses(nextAddresses);
      persistText(STORAGE_KEYS.selectedDeliveryAddressId, address.id);
      persistNumber(STORAGE_KEYS.lat, address.lat);
      persistNumber(STORAGE_KEYS.lng, address.lng);
      persistText(STORAGE_KEYS.reference, address.reference);

      if (normalizedPhone) {
        void syncCustomerToSupabase(
          {
            phone: normalizedPhone,
            lat: address.lat,
            lng: address.lng,
            reference: address.reference,
          },
          normalizedPhone
        );

        void syncDeliveryAddressesToSupabase(
          nextAddresses,
          address.id,
          normalizedPhone
        );
      }

      return address;
    },
    [
      customerPhone,
      deliveryAddresses,
      syncCustomerToSupabase,
      syncDeliveryAddressesToSupabase,
    ]
  );

  const selectDeliveryAddress = useCallback(
    (addressId: string) => {
      const storedAddresses = parseStoredDeliveryAddresses(
        localStorage.getItem(STORAGE_KEYS.deliveryAddresses)
      );

      const sourceAddresses = mergeDeliveryAddressLists(storedAddresses, deliveryAddresses);
      const address = sourceAddresses.find(current => current.id === addressId);

      if (!address) return;

      const normalizedPhone = normalizeEcuadorPhone(customerPhone);
      const nextAddresses = sourceAddresses.map(current => ({
        ...current,
        is_default: current.id === address.id,
      }));

      setDeliveryAddresses(nextAddresses);
      setSelectedDeliveryAddressId(address.id);
      setCustomerLat(address.lat);
      setCustomerLng(address.lng);
      setCustomerReference(address.reference);

      persistDeliveryAddresses(nextAddresses);
      persistText(STORAGE_KEYS.selectedDeliveryAddressId, address.id);
      persistNumber(STORAGE_KEYS.lat, address.lat);
      persistNumber(STORAGE_KEYS.lng, address.lng);
      persistText(STORAGE_KEYS.reference, address.reference);

      if (normalizedPhone) {
        void syncCustomerToSupabase(
          {
            phone: normalizedPhone,
            lat: address.lat,
            lng: address.lng,
            reference: address.reference,
          },
          normalizedPhone
        );

        void syncDeliveryAddressesToSupabase(
          nextAddresses,
          address.id,
          normalizedPhone
        );
      }
    },
    [
      customerPhone,
      deliveryAddresses,
      syncCustomerToSupabase,
      syncDeliveryAddressesToSupabase,
    ]
  );

  const deleteDeliveryAddress = useCallback(
    (addressId: string) => {
      const normalizedPhone = normalizeEcuadorPhone(customerPhone);

      const storedAddresses = parseStoredDeliveryAddresses(
        localStorage.getItem(STORAGE_KEYS.deliveryAddresses)
      );

      const sourceAddresses = mergeDeliveryAddressLists(storedAddresses, deliveryAddresses);
      const nextAddressesRaw = sourceAddresses.filter(address => address.id !== addressId);

      const nextSelectedAddress =
        selectedDeliveryAddressId === addressId
          ? nextAddressesRaw[0] || null
          : nextAddressesRaw.find(address => address.id === selectedDeliveryAddressId) ||
            nextAddressesRaw[0] ||
            null;

      const nextSelectedId = nextSelectedAddress?.id || null;

      const nextAddresses = nextAddressesRaw.map(address => ({
        ...address,
        is_default: address.id === nextSelectedId,
      }));

      setDeliveryAddresses(nextAddresses);
      setSelectedDeliveryAddressId(nextSelectedId);

      persistDeliveryAddresses(nextAddresses);
      persistText(STORAGE_KEYS.selectedDeliveryAddressId, nextSelectedId || '');

      if (nextSelectedAddress) {
        setCustomerLat(nextSelectedAddress.lat);
        setCustomerLng(nextSelectedAddress.lng);
        setCustomerReference(nextSelectedAddress.reference);

        persistNumber(STORAGE_KEYS.lat, nextSelectedAddress.lat);
        persistNumber(STORAGE_KEYS.lng, nextSelectedAddress.lng);
        persistText(STORAGE_KEYS.reference, nextSelectedAddress.reference);
      } else {
        setCustomerLat(null);
        setCustomerLng(null);
        setCustomerReference('');

        persistNumber(STORAGE_KEYS.lat, null);
        persistNumber(STORAGE_KEYS.lng, null);
        persistText(STORAGE_KEYS.reference, '');
      }

      if (normalizedPhone) {
        if (nextSelectedAddress) {
          void syncCustomerToSupabase(
            {
              phone: normalizedPhone,
              lat: nextSelectedAddress.lat,
              lng: nextSelectedAddress.lng,
              reference: nextSelectedAddress.reference,
            },
            normalizedPhone
          );
        }

        void syncDeliveryAddressesToSupabase(
          nextAddresses,
          nextSelectedId,
          normalizedPhone
        );
      }
    },
    [
      customerPhone,
      deliveryAddresses,
      selectedDeliveryAddressId,
      syncCustomerToSupabase,
      syncDeliveryAddressesToSupabase,
    ]
  );

  const logout = useCallback(() => {
    Object.values(STORAGE_KEYS).forEach(key => localStorage.removeItem(key));

    setCustomerPhone('');
    setCustomerName('');
    setCustomerAvatar('');
    setCustomerLat(null);
    setCustomerLng(null);
    setCustomerReference('');
    setCustomerPoints(0);
    setCustomerExp(0);
    setIsVip(false);
    setPhoneVerified(false);
    setDeliveryAddresses([]);
    setSelectedDeliveryAddressId(null);

    setMembershipStatus('none');
    setMembershipPlan('');
    setMembershipStartedAt(null);
    setMembershipExpiresAt(null);
    setMembershipUpdatedAt(null);
    setActiveMembership(null);
  }, []);

  const isLoggedIn = useMemo(() => {
    return Boolean(customerPhone && customerName);
  }, [customerName, customerPhone]);

  const hasDeliveryLocation = useMemo(() => {
    return Boolean(
      customerLat !== null &&
        customerLng !== null &&
        Number.isFinite(customerLat) &&
        Number.isFinite(customerLng) &&
        customerReference.trim().length > 0
    );
  }, [customerLat, customerLng, customerReference]);

  const phoneDisplay = useMemo(() => {
    return formatPhoneForUser(customerPhone);
  }, [customerPhone]);

  const selectedDeliveryAddress = useMemo(() => {
    if (!selectedDeliveryAddressId) return null;

    return (
      deliveryAddresses.find(address => address.id === selectedDeliveryAddressId) || null
    );
  }, [deliveryAddresses, selectedDeliveryAddressId]);

  const hasPollazoPlus = useMemo(() => {
    if (isMembershipActive(activeMembership)) return true;

    if (membershipStatus !== 'active') return false;

    if (!membershipExpiresAt) return true;

    return new Date(membershipExpiresAt).getTime() > Date.now();
  }, [activeMembership, membershipExpiresAt, membershipStatus]);

  const pollazoPlusExpiresAt = useMemo(() => {
    return activeMembership?.expires_at || membershipExpiresAt || null;
  }, [activeMembership, membershipExpiresAt]);

  return (
    <UserContext.Provider
      value={{
        customerPhone,
        customerName,
        customerAvatar,
        customerLat,
        customerLng,
        customerReference,
        customerPoints,
        customerExp,
        isVip,
        phoneVerified,
        isLoggedIn,
        hasDeliveryLocation,
        phoneDisplay,

        membershipStatus,
        membershipPlan,
        membershipStartedAt,
        membershipExpiresAt,
        membershipUpdatedAt,
        activeMembership,
        hasPollazoPlus,
        pollazoPlusExpiresAt,
        refreshMembership,

        deliveryAddresses,
        selectedDeliveryAddressId,
        selectedDeliveryAddress,
        setUserData,
        saveDeliveryAddress,
        selectDeliveryAddress,
        deleteDeliveryAddress,
        logout,
      }}
    >
      {children}
    </UserContext.Provider>
  );
}

export const useUser = () => {
  const context = useContext(UserContext);

  if (!context) {
    throw new Error('useUser debe usarse dentro de UserProvider');
  }

  return context;
};
