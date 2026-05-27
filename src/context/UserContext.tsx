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
  setUserData: (data: SetUserDataInput) => void;
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

const persistText = (key: string, value: string) => {
  const cleanValue = value.trim();

  if (cleanValue) {
    localStorage.setItem(key, cleanValue);
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
  const safeValue = typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.floor(value))
    : 0;

  localStorage.setItem(key, safeValue.toString());

  return safeValue;
};

const persistBoolean = (key: string, value: boolean) => {
  localStorage.setItem(key, value.toString());
};

const isValidCoordinate = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
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

  const applyServerCustomer = useCallback((customer: CustomerSyncRow | null) => {
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
      const nextReference = typeof customer.reference === 'string'
        ? customer.reference
        : '';

      setCustomerReference(nextReference);
      persistText(STORAGE_KEYS.reference, nextReference);
    }
  }, []);

  const fetchCustomerFromSupabase = useCallback(
    async (phone: string) => {
      const normalizedPhone = normalizeEcuadorPhone(phone);

      if (!isSupabaseConfigured || !normalizedPhone) return;

      const { data, error } = await supabase
        .from('customers')
        .select(
          'phone, name, avatar_url, points, exp, is_vip, phone_verified, lat, lng, reference'
        )
        .eq('phone', normalizedPhone)
        .maybeSingle();

      if (error) {
        console.warn('No se pudo cargar cliente desde Supabase:', error);
        return;
      }

      applyServerCustomer(data as CustomerSyncRow | null);
    },
    [applyServerCustomer]
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

      const { data: savedCustomer, error } = await supabase
        .from('customers')
        .upsert(payload, { onConflict: 'phone' })
        .select(
          'phone, name, avatar_url, points, exp, is_vip, phone_verified, lat, lng, reference'
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

  useEffect(() => {
    const storedPhone = localStorage.getItem(STORAGE_KEYS.phone);
    const normalizedPhone = normalizeEcuadorPhone(storedPhone || '');

    const storedName = localStorage.getItem(STORAGE_KEYS.name) || '';
    const storedAvatar = localStorage.getItem(STORAGE_KEYS.avatar) || '';
    const storedReference = localStorage.getItem(STORAGE_KEYS.reference) || '';

    const storedLat = parseStoredNumber(localStorage.getItem(STORAGE_KEYS.lat));
    const storedLng = parseStoredNumber(localStorage.getItem(STORAGE_KEYS.lng));
    const storedPoints = parseStoredInteger(localStorage.getItem(STORAGE_KEYS.points));
    const storedExp = parseStoredInteger(localStorage.getItem(STORAGE_KEYS.exp));
    const storedVip = parseStoredBoolean(localStorage.getItem(STORAGE_KEYS.isVip));
    const storedPhoneVerified = parseStoredBoolean(
      localStorage.getItem(STORAGE_KEYS.phoneVerified)
    );

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
  }, [fetchCustomerFromSupabase]);

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
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [applyServerCustomer, customerPhone]);

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
      }
    },
    [
      customerAvatar,
      customerName,
      customerPhone,
      customerReference,
      phoneVerified,
      syncCustomerToSupabase,
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
        setUserData,
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
