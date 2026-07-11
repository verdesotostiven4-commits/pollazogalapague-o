from pathlib import Path

path = Path('src/context/UserContext.tsx')
text = path.read_text(encoding='utf-8')

text = text.replace(
    "import { supabase, isSupabaseConfigured } from '../lib/supabase';\n",
    "import {\n  closeCustomerSession,\n  fetchCustomerSession,\n  openCustomerSession,\n  type CustomerSessionAccount,\n} from '../utils/customerSessionApi';\n",
)

start = text.index('  const refreshMembership = useCallback(async () => {')
end = text.index('\n  const applyDeliveryAddresses = useCallback', start)
text = text[:start] + text[end:]

start = text.index('  const fetchDeliveryAddressesFromSupabase = useCallback')
end = text.index('\n  useEffect(() => {', start)
replacement = r'''  const applyCustomerAccount = useCallback(
    (account: CustomerSessionAccount) => {
      applyServerCustomer(account.customer as CustomerSyncRow | null);

      const membership = account.membership;
      const active = membership && isMembershipActive(membership) ? membership : null;
      const customer = account.customer;

      applyMembershipState({
        status: active
          ? 'active'
          : membership?.status || customer?.membership_status || 'none',
        plan: membership?.plan_name || customer?.membership_plan || '',
        startedAt:
          membership?.started_at || customer?.membership_started_at || null,
        expiresAt:
          membership?.expires_at || customer?.membership_expires_at || null,
        updatedAt:
          membership?.updated_at ||
          membership?.created_at ||
          customer?.membership_updated_at ||
          null,
        active,
      });
    },
    [applyMembershipState, applyServerCustomer]
  );

  const refreshMembership = useCallback(async () => {
    if (!customerPhone) return;

    try {
      const account = await fetchCustomerSession();
      applyCustomerAccount(account);
    } catch (error) {
      console.warn('No se pudo actualizar la cuenta protegida:', error);
    }
  }, [applyCustomerAccount, customerPhone]);

  const fetchCustomerFromSession = useCallback(
    async (phone: string) => {
      const normalizedPhone = normalizeEcuadorPhone(phone);
      if (!normalizedPhone) return;

      try {
        const account = await openCustomerSession({ phone: normalizedPhone });
        applyCustomerAccount(account);
      } catch (error) {
        console.warn('No se pudo abrir la sesión protegida del cliente:', error);
      }
    },
    [applyCustomerAccount]
  );

  const syncCustomerToServer = useCallback(
    async (data: SetUserDataInput, normalizedPhone: string) => {
      if (!normalizedPhone) return;

      try {
        const account = await openCustomerSession({
          phone: normalizedPhone,
          name: data.name?.trim() || undefined,
          avatarUrl: data.avatar?.trim() || undefined,
          lat: data.lat !== undefined && isValidCoordinate(data.lat) ? data.lat : undefined,
          lng: data.lng !== undefined && isValidCoordinate(data.lng) ? data.lng : undefined,
          reference: data.reference?.trim() || undefined,
        });
        applyCustomerAccount(account);
      } catch (error) {
        console.warn('No se pudo sincronizar el perfil protegido:', error);
      }
    },
    [applyCustomerAccount]
  );

  const syncDeliveryAddressesToServer = useCallback(
    async (
      addresses: DeliveryAddress[],
      selectedId: string | null,
      normalizedPhone: string
    ) => {
      if (!normalizedPhone) return;

      try {
        const account = await openCustomerSession({
          phone: normalizedPhone,
          deliveryAddresses: addresses,
          selectedDeliveryAddressId: selectedId,
        });
        applyCustomerAccount(account);
      } catch (error) {
        console.warn('No se pudieron guardar las direcciones protegidas:', error);
      }
    },
    [applyCustomerAccount]
  );
'''
text = text[:start] + replacement + text[end:]

text = text.replace(
    'void fetchCustomerFromSupabase(normalizedPhone);',
    'void fetchCustomerFromSession(normalizedPhone);',
)
text = text.replace(
    '[applyDeliveryAddresses, applyMembershipState, fetchCustomerFromSupabase]',
    '[applyDeliveryAddresses, applyMembershipState, fetchCustomerFromSession]',
)

text = text.replace(
'''    const storedPoints = parseStoredInteger(localStorage.getItem(STORAGE_KEYS.points));
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
''',
'',
)
text = text.replace(
'''    setCustomerPoints(storedPoints);
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
''',
'',
)

start = text.index("  useEffect(() => {\n    if (!isSupabaseConfigured || !customerPhone)")
end = text.index('\n  const setUserData = useCallback', start)
text = text[:start] + r'''  useEffect(() => {
    if (!customerPhone) return undefined;

    const refresh = () => {
      if (document.visibilityState === 'visible') {
        void refreshMembership();
      }
    };

    const interval = window.setInterval(refresh, 30000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [customerPhone, refreshMembership]);
''' + text[end:]

text = text.replace('syncCustomerToSupabase', 'syncCustomerToServer')
text = text.replace('syncDeliveryAddressesToSupabase', 'syncDeliveryAddressesToServer')

text = text.replace(
'''      const samePhone = normalizedPhone && normalizedPhone === customerPhone;
      const nextPhoneVerified = data.phoneVerified ?? (samePhone ? phoneVerified : false);

      setCustomerPhone(normalizedPhone);
      setCustomerName(name);
      setCustomerAvatar(avatar);
      setPhoneVerified(nextPhoneVerified);

      persistText(STORAGE_KEYS.phone, normalizedPhone);
      persistText(STORAGE_KEYS.name, name);
      persistText(STORAGE_KEYS.avatar, avatar);
      persistBoolean(STORAGE_KEYS.phoneVerified, nextPhoneVerified);
''',
'''      setCustomerPhone(normalizedPhone);
      setCustomerName(name);
      setCustomerAvatar(avatar);

      persistText(STORAGE_KEYS.phone, normalizedPhone);
      persistText(STORAGE_KEYS.name, name);
      persistText(STORAGE_KEYS.avatar, avatar);
''',
)

text = text.replace(
'''      if (data.points !== undefined) {
        setCustomerPoints(persistInteger(STORAGE_KEYS.points, data.points));
      }

      if (data.exp !== undefined) {
        setCustomerExp(persistInteger(STORAGE_KEYS.exp, data.exp));
      }

      if (data.isVip !== undefined) {
        setIsVip(data.isVip);
        persistBoolean(STORAGE_KEYS.isVip, data.isVip);
      }

''',
'',
)
text = text.replace(
'''      if (
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

''',
'',
)
text = text.replace(
'''            reference,
            phoneVerified: nextPhoneVerified,
''',
'''            reference,
''',
)

text = text.replace(
    "  const logout = useCallback(() => {\n    Object.values(STORAGE_KEYS).forEach",
    "  const logout = useCallback(() => {\n    void closeCustomerSession();\n    Object.values(STORAGE_KEYS).forEach",
)

path.write_text(text, encoding='utf-8')
