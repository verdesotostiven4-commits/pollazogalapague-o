import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import InteractiveRasterMap from './InteractiveRasterMap';
import {
  Camera,
  User,
  Phone,
  X,
  Sparkles,
  Check,
  MapPin,
  Navigation,
  ArrowRight,
  ArrowLeft,
  LocateFixed,
  ShieldCheck,
  WifiOff,
  Home,
  Building2,
  Umbrella,
  MapPinned,
} from 'lucide-react';
import { PRESET_AVATARS } from '../constants/avatars';
import { useUser } from '../context/UserContext';
import type { DeliveryAddressLabel } from '../types';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (data: {
    name: string;
    whatsapp: string;
    avatarUrl: string;
    lat: number | null;
    lng: number | null;
    reference: string;
  }) => void;
  isMandatory?: boolean;
  isChangingLocation?: boolean;
  title?: string;
  subtitle?: string;
}

interface LatLng {
  lat: number;
  lng: number;
}

type LocationRequestOptions = {
  moveMap?: boolean;
  silent?: boolean;
  updateSelectedPoint?: boolean;
};

const DEFAULT_AVATAR = PRESET_AVATARS[0]?.url || '';
const DEFAULT_CENTER: LatLng = { lat: -0.7439, lng: -90.3131 };
const EDIT_ADDRESS_STORAGE_KEY = 'pollazo_edit_delivery_address_id';

const MAP_STYLE = {
  version: 8,
  sources: {
    'osm-standard': {
      type: 'raster',
      tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
      tileSize: 256,
      minzoom: 0,
      maxzoom: 19,
      attribution: '© OpenStreetMap contributors',
    },
  },
  layers: [
    {
      id: 'osm-standard',
      type: 'raster',
      source: 'osm-standard',
      minzoom: 0,
      maxzoom: 19,
    },
  ],
} as any;
const MAP_MAX_ZOOM = 18;
const MAP_DEFAULT_ZOOM = 17;
const MAP_GPS_ZOOM = 17;
const MAP_PIN_OFFSET_Y = 56;

const PUERTO_AYORA_BOUNDS = {
  latMin: -0.765,
  latMax: -0.728,
  lngMin: -90.345,
  lngMax: -90.295,
};

const ADDRESS_LABELS: Array<{
  label: DeliveryAddressLabel;
  icon: React.ReactNode;
}> = [
  { label: 'Casa', icon: <Home size={14} /> },
  { label: 'Trabajo', icon: <Building2 size={14} /> },
  { label: 'Airbnb', icon: <Umbrella size={14} /> },
  { label: 'Otro', icon: <MapPinned size={14} /> },
];

const preloadedAvatarCache = new Set<string>();

const cleanDigits = (value: string) => value.replace(/\D/g, '');

const isPointInsidePuertoAyora = (position: LatLng): boolean => {
  return (
    position.lat >= PUERTO_AYORA_BOUNDS.latMin &&
    position.lat <= PUERTO_AYORA_BOUNDS.latMax &&
    position.lng >= PUERTO_AYORA_BOUNDS.lngMin &&
    position.lng <= PUERTO_AYORA_BOUNDS.lngMax
  );
};

const formatSelectedLocationLabel = (position: LatLng | null): string => {
  if (!position) {
    return 'Mueve el mapa para marcar tu punto de entrega';
  }

  if (!isPointInsidePuertoAyora(position)) {
    return `Fuera de cobertura · ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
  }

  return `Puerto Ayora · ${position.lat.toFixed(5)}, ${position.lng.toFixed(5)}`;
};

const normalizeEcuadorPhone = (phone: string): string => {
  const digits = cleanDigits(phone);

  if (!digits) return '';

  if (digits.startsWith('593') && digits.length >= 12) {
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

const formatPhoneForInput = (phone: string): string => {
  const digits = cleanDigits(phone);

  if (digits.startsWith('593') && digits.length >= 12) {
    return `0${digits.slice(3)}`;
  }

  return digits;
};

const isValidEcuadorMobile = (phone: string): boolean => {
  const normalized = normalizeEcuadorPhone(phone);
  return /^5939\d{8}$/.test(normalized);
};

const isFiniteNumber = (value: unknown): value is number => {
  return typeof value === 'number' && Number.isFinite(value);
};

const createUserMarkerElement = () => {
  const marker = document.createElement('div');
  marker.className = 'pollazo-user-dot';
  marker.innerHTML = `
    <span class="pollazo-user-halo"></span>
    <span class="pollazo-user-core"></span>
  `;
  return marker;
};

export default function LoginModal({
  isOpen,
  onClose,
  onLogin,
  isMandatory = false,
  isChangingLocation = false,
  title,
  subtitle,
}: LoginModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstance = useRef<maplibregl.Map | null>(null);
  const userMarkerRef = useRef<maplibregl.Marker | null>(null);
  const selectedPointRef = useRef<LatLng>(DEFAULT_CENTER);
  const liveCoordinateLabelRef = useRef<HTMLParagraphElement | null>(null);
  const liveCoordinateFrameRef = useRef<number | null>(null);
  const fallbackMapFrameRef = useRef<number | null>(null);

  const {
    customerName,
    customerPhone,
    customerAvatar,
    customerLat,
    customerLng,
    customerReference,
    selectedDeliveryAddress,
    deliveryAddresses,
    saveDeliveryAddress,
  } = useUser();

  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [lat, setLat] = useState<number | null>(null);
  const [lng, setLng] = useState<number | null>(null);
  const [reference, setReference] = useState('');
  const [addressLabel, setAddressLabel] = useState<DeliveryAddressLabel>('Casa');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);

  const [userActualLocation, setUserActualLocation] = useState<LatLng | null>(null);
  const [loadedAvatarUrls, setLoadedAvatarUrls] = useState<Set<string>>(() => {
    const initial = new Set<string>();

    if (DEFAULT_AVATAR) {
      initial.add(DEFAULT_AVATAR);
    }

    return initial;
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSavingLocation, setIsSavingLocation] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const [fallbackMapCenter, setFallbackMapCenter] = useState<LatLng>(DEFAULT_CENTER);
  const [fallbackMapZoom, setFallbackMapZoom] = useState(MAP_DEFAULT_ZOOM);
  const [error, setError] = useState('');
  const [gpsNotice, setGpsNotice] = useState('');

  const hasSavedDeliveryPoint = useMemo(() => {
    return isFiniteNumber(customerLat) && isFiniteNumber(customerLng);
  }, [customerLat, customerLng]);

  const modalTitle = title || (step === 1 ? 'Únete al Club' : 'Confirmar dirección');
  const modalSubtitle =
    subtitle ||
    (step === 1
      ? 'Acumula puntos y gana premios'
      : isChangingLocation
        ? editingAddressId
          ? 'Edita tu dirección guardada'
          : 'Agrega una nueva dirección'
        : 'Marca dónde recibes tu pedido');

  const normalizedWhatsapp = useMemo(() => normalizeEcuadorPhone(whatsapp), [whatsapp]);
  const phoneIsValid = useMemo(() => isValidEcuadorMobile(whatsapp), [whatsapp]);

  const selectedPointIsReady = lat !== null && lng !== null;

  const isInsideGeofence =
    selectedPointIsReady &&
    lat >= PUERTO_AYORA_BOUNDS.latMin &&
    lat <= PUERTO_AYORA_BOUNDS.latMax &&
    lng >= PUERTO_AYORA_BOUNDS.lngMin &&
    lng <= PUERTO_AYORA_BOUNDS.lngMax;

  const selectedAvatarReady = avatar.startsWith('data:') || loadedAvatarUrls.has(avatar);

  const selectedLocationLabel = useMemo(() => {
    return formatSelectedLocationLabel(lat !== null && lng !== null ? { lat, lng } : null);
  }, [lat, lng]);

  const paintLiveCoordinateLabel = useCallback((position: LatLng | null) => {
    if (!liveCoordinateLabelRef.current) return;

    liveCoordinateLabelRef.current.textContent = formatSelectedLocationLabel(position);
  }, []);

  useEffect(() => {
    if (lat !== null && lng !== null) {
      const nextPosition = { lat, lng };
      selectedPointRef.current = nextPosition;
      paintLiveCoordinateLabel(nextPosition);
      return;
    }

    paintLiveCoordinateLabel(null);
  }, [lat, lng, paintLiveCoordinateLabel]);

  const clearEditingRequest = useCallback(() => {
    sessionStorage.removeItem(EDIT_ADDRESS_STORAGE_KEY);
    setEditingAddressId(null);
  }, []);

  const handleSafeClose = useCallback(() => {
    clearEditingRequest();
    onClose();
  }, [clearEditingRequest, onClose]);

  const markAvatarLoaded = useCallback((url: string) => {
    if (!url) return;

    preloadedAvatarCache.add(url);

    setLoadedAvatarUrls(prev => {
      const next = new Set(prev);
      next.add(url);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!isOpen) {
      clearEditingRequest();
    }
  }, [clearEditingRequest, isOpen]);

  useEffect(() => {
    let mounted = true;

    PRESET_AVATARS.forEach(item => {
      if (!item.url) return;

      if (preloadedAvatarCache.has(item.url)) {
        setLoadedAvatarUrls(prev => {
          const next = new Set(prev);
          next.add(item.url);
          return next;
        });
        return;
      }

      const img = new Image();
      img.decoding = 'async';

      try {
        (img as HTMLImageElement & { fetchPriority?: 'high' }).fetchPriority = 'high';
      } catch {
        // El navegador puede no soportar fetchPriority.
      }

      img.onload = () => {
        preloadedAvatarCache.add(item.url);

        if (!mounted) return;

        setLoadedAvatarUrls(prev => {
          const next = new Set(prev);
          next.add(item.url);
          return next;
        });
      };

      img.onerror = () => {
        if (!mounted) return;

        setLoadedAvatarUrls(prev => {
          const next = new Set(prev);
          next.add(item.url);
          return next;
        });
      };

      img.src = item.url;
    });

    return () => {
      mounted = false;
    };
  }, []);

  const getPinnedPositionFromMap = useCallback(() => {
    const map = mapInstance.current;

    if (!map) return selectedPointRef.current;

    const canvas = map.getCanvas();
    const pinnedLngLat = map.unproject([
      canvas.clientWidth / 2,
      canvas.clientHeight / 2 + MAP_PIN_OFFSET_Y,
    ]);

    return {
      lat: pinnedLngLat.lat,
      lng: pinnedLngLat.lng,
    };
  }, []);

  const paintLiveSelectedPointFromMap = useCallback(() => {
    const nextPosition = getPinnedPositionFromMap();

    if (!nextPosition) return null;

    selectedPointRef.current = nextPosition;
    paintLiveCoordinateLabel(nextPosition);

    return nextPosition;
  }, [getPinnedPositionFromMap, paintLiveCoordinateLabel]);

  const scheduleLiveSelectedPointPaint = useCallback(() => {
    if (liveCoordinateFrameRef.current !== null) return;

    liveCoordinateFrameRef.current = window.requestAnimationFrame(() => {
      liveCoordinateFrameRef.current = null;
      paintLiveSelectedPointFromMap();
    });
  }, [paintLiveSelectedPointFromMap]);

  const syncSelectedPointFromMap = useCallback(() => {
    const nextPosition = paintLiveSelectedPointFromMap();

    if (!nextPosition) return null;

    setLat(nextPosition.lat);
    setLng(nextPosition.lng);

    return nextPosition;
  }, [paintLiveSelectedPointFromMap]);

  const syncUserMarker = useCallback((position: LatLng) => {
    const map = mapInstance.current;

    if (!map) return;

    if (!userMarkerRef.current) {
      userMarkerRef.current = new maplibregl.Marker({
        element: createUserMarkerElement(),
        anchor: 'center',
      })
        .setLngLat([position.lng, position.lat])
        .addTo(map);
      return;
    }

    userMarkerRef.current.setLngLat([position.lng, position.lat]);
  }, []);

  const removeUserMarker = useCallback(() => {
    if (!userMarkerRef.current) return;

    userMarkerRef.current.remove();
    userMarkerRef.current = null;
  }, []);

  const keepZoomSafe = useCallback(() => {
    const map = mapInstance.current;

    if (!map) return;

    const currentZoom = map.getZoom();

    if (currentZoom > MAP_MAX_ZOOM) {
      map.easeTo({ zoom: MAP_MAX_ZOOM, duration: 120 });
    }
  }, []);

  const moveMapTo = useCallback((position: LatLng, zoom = MAP_DEFAULT_ZOOM) => {
    const safeZoom = Math.min(zoom, MAP_MAX_ZOOM);

    selectedPointRef.current = position;
    setFallbackMapCenter(position);
    setFallbackMapZoom(safeZoom);
    setLat(position.lat);
    setLng(position.lng);
    paintLiveCoordinateLabel(position);

    const map = mapInstance.current;
    if (!map) return;

    map.flyTo({
      center: [position.lng, position.lat],
      zoom: safeZoom,
      offset: [0, MAP_PIN_OFFSET_Y],
      duration: 850,
    });
  }, [paintLiveCoordinateLabel]);

  const goToPuertoAyora = useCallback(
    (message?: string) => {
      setLat(DEFAULT_CENTER.lat);
      setLng(DEFAULT_CENTER.lng);
      setUserActualLocation(null);
      removeUserMarker();

      if (message) {
        setGpsNotice(message);
      }

      moveMapTo(DEFAULT_CENTER, MAP_DEFAULT_ZOOM);
    },
    [moveMapTo, removeUserMarker]
  );

  const requestLocation = useCallback(
    (options?: LocationRequestOptions) => {
      if (!navigator.geolocation) {
        setError('Tu navegador no permite usar GPS. Mueve el mapa manualmente.');
        setIsLocating(false);
        return;
      }

      const shouldUpdateSelectedPoint = options?.updateSelectedPoint !== false;

      setIsLocating(true);

      if (!options?.silent) {
        setError('');
        setGpsNotice('');
      }

      navigator.geolocation.getCurrentPosition(
        pos => {
          const nextPosition = {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
          };

          setIsLocating(false);

          if (!isPointInsidePuertoAyora(nextPosition)) {
            setUserActualLocation(null);
            removeUserMarker();

            if (shouldUpdateSelectedPoint) {
              setLat(DEFAULT_CENTER.lat);
              setLng(DEFAULT_CENTER.lng);
            }

            if (options?.moveMap !== false) {
              moveMapTo(DEFAULT_CENTER, MAP_DEFAULT_ZOOM);
            }

            setGpsNotice(
              'Tu GPS está fuera de Puerto Ayora. El mapa queda en zona de entrega para que marques manualmente.'
            );

            return;
          }

          setUserActualLocation(nextPosition);
          setGpsNotice('');

          if (shouldUpdateSelectedPoint) {
            setLat(nextPosition.lat);
            setLng(nextPosition.lng);
          }

          if (options?.moveMap !== false) {
            moveMapTo(nextPosition, MAP_GPS_ZOOM);
          }

          syncUserMarker(nextPosition);
        },
        () => {
          setError('Activa el GPS para encontrarte o mueve el mapa manualmente.');
          setIsLocating(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 20000 }
      );
    },
    [moveMapTo, removeUserMarker, syncUserMarker]
  );

  useEffect(() => {
    if (!isOpen) return;

    setMapReady(false);
    setMapFailed(false);
    setIsSavingLocation(false);

    const requestedEditId = sessionStorage.getItem(EDIT_ADDRESS_STORAGE_KEY);
    const addressToEdit = requestedEditId
      ? deliveryAddresses.find(address => address.id === requestedEditId) || null
      : null;

    setEditingAddressId(addressToEdit?.id || null);

    setName(customerName || '');
    setWhatsapp(formatPhoneForInput(customerPhone || ''));
    setAvatar(customerAvatar || DEFAULT_AVATAR);
    setUserActualLocation(null);
    setGpsNotice('');

    if (isChangingLocation && addressToEdit) {
      setReference(addressToEdit.reference || '');
      setAddressLabel(addressToEdit.label || 'Casa');
      setLat(addressToEdit.lat);
      setLng(addressToEdit.lng);
      setStep(2);
      setError('');

      requestLocation({
        moveMap: false,
        silent: true,
        updateSelectedPoint: false,
      });

      return;
    }

    if (isChangingLocation && !addressToEdit) {
      setReference('');
      setAddressLabel('Casa');
      setLat(DEFAULT_CENTER.lat);
      setLng(DEFAULT_CENTER.lng);
      setStep(2);
      setError('');

      requestLocation({
        moveMap: true,
        silent: true,
        updateSelectedPoint: true,
      });

      return;
    }

    setReference(customerReference || '');
    setAddressLabel(selectedDeliveryAddress?.label || 'Casa');

    const savedLat = hasSavedDeliveryPoint ? customerLat : null;
    const savedLng = hasSavedDeliveryPoint ? customerLng : null;

    setLat(savedLat ?? DEFAULT_CENTER.lat);
    setLng(savedLng ?? DEFAULT_CENTER.lng);

    if (isMandatory) {
      if (!customerName || !customerPhone) {
        setStep(1);
        setError('Completa tus datos para poder coordinar la entrega.');
        return;
      }

      if (!hasSavedDeliveryPoint || !customerReference) {
        setStep(2);
        setError('');
        setGpsNotice('Marca tu ubicación de entrega para finalizar el pedido.');
        setLat(DEFAULT_CENTER.lat);
        setLng(DEFAULT_CENTER.lng);

        requestLocation({
          moveMap: true,
          silent: true,
          updateSelectedPoint: true,
        });

        return;
      }
    }

    setStep(1);
    setError('');
  }, [
    customerAvatar,
    customerLat,
    customerLng,
    customerName,
    customerPhone,
    customerReference,
    deliveryAddresses,
    hasSavedDeliveryPoint,
    isChangingLocation,
    isMandatory,
    isOpen,
    requestLocation,
    selectedDeliveryAddress,
  ]);

  useEffect(() => {
    if (!isOpen || step !== 2 || !mapContainerRef.current || mapInstance.current) {
      return undefined;
    }

    let disposed = false;
    let loaded = false;
    const startPosition = selectedPointRef.current || DEFAULT_CENTER;

    setMapReady(false);
    setMapFailed(false);
    setFallbackMapCenter(startPosition);
    setFallbackMapZoom(MAP_DEFAULT_ZOOM);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: [startPosition.lng, startPosition.lat],
      zoom: MAP_DEFAULT_ZOOM,
      minZoom: 5,
      maxZoom: MAP_MAX_ZOOM,
      attributionControl: { compact: true },
      renderWorldCopies: false,
      fadeDuration: 120,
    });


mapInstance.current = map;

const scheduleFallbackMapSync = () => {
  if (fallbackMapFrameRef.current !== null) return;

  fallbackMapFrameRef.current = window.requestAnimationFrame(() => {
    fallbackMapFrameRef.current = null;
    const center = map.getCenter();
    setFallbackMapCenter({ lat: center.lat, lng: center.lng });
    setFallbackMapZoom(map.getZoom());
  });
};

const loadingTimeout = window.setTimeout(() => {
      if (disposed || loaded) return;

      setMapFailed(true);
      setError('No se pudo cargar el mapa. Revisa tu conexión e intenta nuevamente.');
    }, 12000);

    map.on('load', () => {
      if (disposed) return;

      loaded = true;
      window.clearTimeout(loadingTimeout);

      window.requestAnimationFrame(() => {
        if (disposed) return;

        map.resize();
        scheduleFallbackMapSync();
        map.flyTo({
          center: [startPosition.lng, startPosition.lat],
          zoom: MAP_DEFAULT_ZOOM,
          offset: [0, MAP_PIN_OFFSET_Y],
          duration: 0,
        });

        syncSelectedPointFromMap();

        if (userActualLocation && isPointInsidePuertoAyora(userActualLocation)) {
          syncUserMarker(userActualLocation);
        }

        setMapReady(true);
      });
    });

    map.on('movestart', () => {
      setIsDragging(true);
    });

    map.on('move', () => {
      scheduleLiveSelectedPointPaint();
      scheduleFallbackMapSync();
    });

    map.on('moveend', () => {
      keepZoomSafe();
      syncSelectedPointFromMap();
      setIsDragging(false);
    });

    map.on('zoomend', () => {
      keepZoomSafe();
    });

    map.on('error', event => {
      if (!loaded) {
        console.warn('MapLibre loading error', event?.error || event);
      }
    });

    return () => {
      disposed = true;
      window.clearTimeout(loadingTimeout);

      if (liveCoordinateFrameRef.current !== null) {
        window.cancelAnimationFrame(liveCoordinateFrameRef.current);
        liveCoordinateFrameRef.current = null;
      }

      if (fallbackMapFrameRef.current !== null) {
        window.cancelAnimationFrame(fallbackMapFrameRef.current);
        fallbackMapFrameRef.current = null;
      }

      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }

      map.remove();
      mapInstance.current = null;
      setMapReady(false);
      setIsDragging(false);
    };
  }, [
    isOpen,
    keepZoomSafe,
    scheduleLiveSelectedPointPaint,
    step,
    syncSelectedPointFromMap,
    syncUserMarker,
    userActualLocation,
  ]);

  useEffect(() => {
    if (mapInstance.current && userActualLocation && isPointInsidePuertoAyora(userActualLocation)) {
      syncUserMarker(userActualLocation);
    }
  }, [syncUserMarker, userActualLocation]);

  useEffect(() => {
    if (step !== 2 || lat === null || lng === null) return;

    if (!isInsideGeofence) {
      setError('Fuera de cobertura. Solo entregamos dentro de Puerto Ayora.');
      return;
    }

    setError(prev => (prev.includes('cobertura') ? '' : prev));
  }, [isInsideGeofence, lat, lng, step]);

  const handleGetLocation = () => {
    requestLocation({
      moveMap: true,
      updateSelectedPoint: true,
    });
  };

  const handlePuertoAyoraButton = () => {
    setError('');
    goToPuertoAyora('Mapa centrado en Puerto Ayora. Mueve el pin hasta el punto de entrega.');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = event => {
      const img = new Image();

      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 400;

        canvas.width = size;
        canvas.height = size;

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        const min = Math.min(img.width, img.height);

        ctx.drawImage(
          img,
          (img.width - min) / 2,
          (img.height - min) / 2,
          min,
          min,
          0,
          0,
          size,
          size
        );

        const processedAvatar = canvas.toDataURL('image/jpeg', 0.82);

        setAvatar(processedAvatar);
        markAvatarLoaded(processedAvatar);
        setIsProcessing(false);
      };

      img.onerror = () => {
        setError('No se pudo cargar la imagen. Intenta con otra foto.');
        setIsProcessing(false);
      };

      img.src = event.target?.result as string;
    };

    reader.onerror = () => {
      setError('No se pudo leer la imagen. Intenta nuevamente.');
      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const goToLocationStep = () => {
    setError('');
    setStep(2);

    if (hasSavedDeliveryPoint) {
      setLat(customerLat);
      setLng(customerLng);

      requestLocation({
        moveMap: false,
        silent: true,
        updateSelectedPoint: false,
      });
      return;
    }

    setLat(DEFAULT_CENTER.lat);
    setLng(DEFAULT_CENTER.lng);

    requestLocation({
      moveMap: true,
      silent: true,
      updateSelectedPoint: true,
    });
  };

  const handleNextStep = () => {
    if (!name.trim()) {
      setError(
        isMandatory
          ? 'Necesitamos tu nombre para poder entregarte el pedido.'
          : 'Escribe tu nombre o alias.'
      );
      return;
    }

    if (!whatsapp.trim()) {
      setError(
        isMandatory
          ? 'Necesitamos tu WhatsApp para coordinar la entrega.'
          : 'Escribe tu número de WhatsApp.'
      );
      return;
    }

    if (!phoneIsValid) {
      setError('Escribe un WhatsApp válido de Ecuador. Ej: 098 979 5628');
      return;
    }

    goToLocationStep();
  };

  const handleSave = () => {
    const finalPoint = syncSelectedPointFromMap() || selectedPointRef.current;

    if (!finalPoint) {
      setError('Marca tu punto de entrega en el mapa.');
      return;
    }

    if (!isPointInsidePuertoAyora(finalPoint)) {
      setError('Fuera de cobertura. Solo entregamos dentro de Puerto Ayora.');
      return;
    }

    if (!reference.trim()) {
      setError(
        isMandatory
          ? 'Es obligatorio poner una referencia para entregarte exacto.'
          : 'Danos una referencia. Ej: casa azul, portón negro.'
      );
      return;
    }

    setIsSavingLocation(true);

    saveDeliveryAddress({
      id: editingAddressId || undefined,
      label: addressLabel,
      lat: finalPoint.lat,
      lng: finalPoint.lng,
      reference: reference.trim(),
      isDefault: true,
    });

    sessionStorage.removeItem(EDIT_ADDRESS_STORAGE_KEY);

    onLogin({
      name: name.trim(),
      whatsapp: normalizedWhatsapp,
      avatarUrl: avatar,
      lat: finalPoint.lat,
      lng: finalPoint.lng,
      reference: reference.trim(),
    });
  };

  if (!isOpen) return null;

  if (step === 2) {
    return (
      <div className="fixed inset-0 z-[10000] bg-slate-100 overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[54dvh] min-h-[350px] max-h-[460px] z-0 overflow-hidden bg-slate-100">
          <InteractiveRasterMap
            center={fallbackMapCenter}
            zoom={fallbackMapZoom}
            minZoom={14}
            maxZoom={19}
            pinOffsetY={MAP_PIN_OFFSET_Y}
            interactive
            showControls
            onReady={() => {
              setMapReady(true);
              setMapFailed(false);
            }}
            onViewChange={(position, nextZoom, final) => {
              selectedPointRef.current = position;
              setFallbackMapCenter(position);
              setFallbackMapZoom(nextZoom);
              setLat(position.lat);
              setLng(position.lng);
              paintLiveCoordinateLabel(position);
              setIsDragging(!final);
            }}
          />

          {!mapReady && !mapFailed && (
            <div className="absolute inset-0 z-[500] bg-gradient-to-br from-orange-50 via-white to-amber-50 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-[28px] bg-white shadow-xl flex items-center justify-center">
                <Navigation size={25} className="text-orange-500 animate-pulse" />
              </div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Cargando mapa...
              </p>
            </div>
          )}

          {mapFailed && (
            <div className="absolute inset-0 z-[500] bg-white flex flex-col items-center justify-center gap-3 px-8 text-center">
              <WifiOff size={36} className="text-orange-500" />
              <p className="text-sm font-black text-slate-800 uppercase leading-relaxed">
                No se pudo cargar el mapa
              </p>
              <p className="text-xs font-bold text-slate-400 leading-relaxed">
                Revisa tu conexión e intenta nuevamente.
              </p>
            </div>
          )}

          <div
            className={`absolute left-1/2 -translate-x-1/2 z-[650] pointer-events-none transition-opacity duration-200 ${
              isDragging ? 'opacity-100' : 'opacity-0'
            }`}
            style={{ top: `calc(50% + ${MAP_PIN_OFFSET_Y}px)` }}
          >
            <div className="w-1.5 h-1.5 bg-gray-500 rounded-full shadow-lg border border-white/70" />
          </div>

          <div
            className={`absolute left-1/2 -translate-x-1/2 z-[650] pointer-events-none transition-all duration-300 ease-out flex flex-col items-center ${
              isDragging ? '-translate-y-[108%] scale-90' : '-translate-y-full scale-100'
            }`}
            style={{ top: `calc(50% + ${MAP_PIN_OFFSET_Y}px)` }}
          >
            <div className="bg-orange-500 p-2.5 rounded-[20px] shadow-[0_10px_24px_rgba(249,115,22,0.45)] border-2 border-white">
              <MapPin size={28} className="text-white fill-white" />
            </div>

            <div
              className={`w-[3px] bg-orange-600 transition-all duration-300 ${
                isDragging ? 'h-8 opacity-45' : 'h-5 opacity-100'
              }`}
            />

            <div className="w-3 h-1.5 bg-black/20 rounded-full blur-[1px]" />
          </div>
        </div>

        {isSavingLocation && (
          <div className="absolute inset-0 z-[900] bg-white/75 backdrop-blur-md flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-[28px] bg-orange-500 shadow-xl flex items-center justify-center">
              <Check size={26} className="text-white" />
            </div>
            <p className="text-xs font-black text-slate-700 uppercase tracking-widest">
              Guardando dirección...
            </p>
          </div>
        )}

        <div className="absolute top-0 left-0 right-0 z-[720] pt-[calc(env(safe-area-inset-top)+14px)] px-4 pb-5 bg-gradient-to-b from-white/95 via-white/80 to-transparent backdrop-blur-sm">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => {
                if (isSavingLocation) return;

                if (isChangingLocation) {
                  if (!isMandatory) handleSafeClose();
                  return;
                }

                setStep(1);
              }}
              className="w-12 h-12 rounded-2xl bg-white/95 text-slate-700 shadow-xl border border-white flex items-center justify-center active:scale-90 transition-transform"
              aria-label={isChangingLocation ? 'Cerrar mapa' : 'Volver'}
            >
              {isChangingLocation ? <X size={21} /> : <ArrowLeft size={21} />}
            </button>

            <div className="flex-1 min-w-0 bg-white/95 border border-white rounded-[24px] px-4 py-3 shadow-xl">
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest leading-none">
                Confirmar dirección
              </p>
              <p className="text-sm font-black text-slate-900 uppercase truncate mt-1 leading-none">
                Marca tu punto exacto
              </p>
            </div>

            <button
              type="button"
              onClick={handleGetLocation}
              className={`w-12 h-12 rounded-2xl shadow-xl border border-white flex items-center justify-center active:scale-90 transition-all ${
                isLocating
                  ? 'bg-orange-500 text-white animate-pulse'
                  : 'bg-white/95 text-orange-500'
              }`}
              aria-label="Usar mi ubicación actual"
            >
              <LocateFixed size={21} />
            </button>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={handlePuertoAyoraButton}
              className="px-4 py-2 bg-slate-950 text-white rounded-full shadow-lg text-[9px] font-black uppercase active:scale-95 transition-transform flex items-center gap-1.5"
            >
              <MapPin size={12} />
              Puerto Ayora
            </button>

            <div
              className={`px-4 py-2 bg-white/95 backdrop-blur-md rounded-full shadow-lg border border-orange-100 transition-all duration-300 ${
                isDragging ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
              }`}
            >
              <p className="text-[9px] font-black text-orange-600 uppercase whitespace-nowrap">
                {isInsideGeofence ? 'Punto dentro de zona' : 'Mueve el mapa'}
              </p>
            </div>
          </div>
        </div>

        <div className="absolute left-0 right-0 bottom-0 z-[730] bg-white rounded-t-[32px] shadow-[0_-18px_60px_rgba(15,23,42,0.18)] border-t border-white px-5 pt-3 pb-[calc(env(safe-area-inset-bottom)+16px)]">
          <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-3" />

          <div
            className={`rounded-2xl border px-3 py-2 mb-2 ${
              isInsideGeofence
                ? 'bg-green-50 border-green-100'
                : 'bg-orange-50 border-orange-100'
            }`}
          >
            <p
              className={`text-[9px] font-black uppercase tracking-widest leading-none ${
                isInsideGeofence ? 'text-green-600' : 'text-orange-600'
              }`}
            >
              Punto seleccionado
            </p>
            <p
              ref={liveCoordinateLabelRef}
              className="text-[11px] font-black text-slate-700 leading-snug mt-1"
            >
              {selectedLocationLabel}
            </p>
          </div>

          {gpsNotice && (
            <p className="text-[9px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-3 py-2 rounded-2xl text-center leading-snug mb-2">
              {gpsNotice}
            </p>
          )}

          <div className="mb-3">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic mb-2">
              {editingAddressId ? 'Editando dirección' : 'Guardar como'}
            </h3>

            <div className="grid grid-cols-4 gap-2">
              {ADDRESS_LABELS.map(item => (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setAddressLabel(item.label)}
                  className={`rounded-2xl px-2 py-2.5 border text-[8px] font-black uppercase flex flex-col items-center justify-center gap-1 active:scale-95 transition-all ${
                    addressLabel === item.label
                      ? 'bg-orange-500 text-white border-orange-500 shadow-lg shadow-orange-200'
                      : 'bg-slate-50 text-slate-500 border-slate-100'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
              Referencia
            </h3>

            <textarea
              value={reference}
              onChange={e => setReference(e.target.value)}
              placeholder="Ej: casa blanca, portón negro, junto a la farmacia..."
              className="w-full h-[64px] rounded-[22px] bg-slate-50 border border-slate-100 p-4 text-xs font-bold text-slate-700 outline-none focus:border-orange-500 transition-all resize-none shadow-inner"
            />
          </div>

          {error && (
            <p className="text-center text-[10px] font-black text-red-500 uppercase mt-3 leading-tight">
              {error}
            </p>
          )}

          <button
            onClick={handleSave}
            disabled={!isInsideGeofence || isSavingLocation}
            className={`mt-4 w-full rounded-[24px] bg-gradient-to-r from-orange-500 to-orange-600 min-h-[56px] text-[12px] font-black text-white shadow-xl shadow-orange-500/35 active:scale-95 uppercase tracking-widest transition-all border-b-4 border-orange-700 flex items-center justify-center gap-2 ${
              !isInsideGeofence || isSavingLocation
                ? 'opacity-45 cursor-not-allowed select-none'
                : ''
            }`}
          >
            {isSavingLocation
              ? 'GUARDANDO...'
              : editingAddressId
                ? `ACTUALIZAR ${addressLabel.toUpperCase()} ✅`
                : isChangingLocation
                  ? `GUARDAR ${addressLabel.toUpperCase()} 📍`
                  : 'CONFIRMAR PUNTO 🚀'}
          </button>
        </div>

        <style>{`
          .pollazo-maplibre {
            font-family: inherit;
            background: transparent;
            cursor: grab;
            contain: layout size;
          }

          .pollazo-maplibre:active {
            cursor: grabbing;
          }

          .pollazo-maplibre .maplibregl-canvas {
            outline: none;
            background: transparent !important;
          }

          .pollazo-maplibre .maplibregl-ctrl-attrib {
            display: none !important;
          }

          .pollazo-user-dot {
            position: relative;
            width: 22px;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: center;
            pointer-events: none;
          }

          .pollazo-user-halo {
            position: absolute;
            width: 22px;
            height: 22px;
            border-radius: 9999px;
            background: rgba(59, 130, 246, 0.2);
            border: 1px solid rgba(59, 130, 246, 0.35);
          }

          .pollazo-user-core {
            position: relative;
            width: 12px;
            height: 12px;
            border-radius: 9999px;
            background: #2563eb;
            border: 2px solid white;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.4);
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-white/40 backdrop-blur-3xl animate-in fade-in duration-500"
        onClick={isMandatory ? undefined : handleSafeClose}
      />

      <div className="relative w-full max-w-sm bg-white/95 backdrop-blur-md rounded-[50px] shadow-[0_20px_100px_-20px_rgba(0,0,0,0.3)] border border-white flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
        <div className="p-6 pb-2 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-orange-500 p-2 rounded-2xl shadow-lg shadow-orange-200">
              <Sparkles size={18} className="text-white fill-white" />
            </div>

            <div className="text-left leading-tight">
              <h2 className="text-xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
                {modalTitle}
              </h2>
              <p className="text-[9px] font-black text-orange-500 uppercase tracking-widest mt-1">
                {modalSubtitle}
              </p>
            </div>
          </div>

          {!isMandatory && (
            <button
              onClick={handleSafeClose}
              className="p-2 bg-slate-100 text-slate-400 rounded-full active:scale-75 transition-all"
              aria-label="Cerrar registro"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto hide-scrollbar p-6 pt-2 space-y-5">
          <div className="animate-in slide-in-from-left duration-300">
            <div className="bg-gradient-to-br from-orange-50/70 via-white to-amber-50/50 p-5 rounded-[35px] border border-orange-100/70 shadow-inner flex flex-col items-center gap-5">
              <div className="relative">
                <div className="h-24 w-24 rounded-[32px] overflow-hidden ring-[6px] ring-white shadow-xl bg-white group relative">
                  {!selectedAvatarReady && (
                    <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-amber-50 animate-pulse" />
                  )}

                  <img
                    src={avatar}
                    className={`h-full w-full object-cover transition-all duration-500 group-hover:scale-110 ${
                      selectedAvatarReady ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
                    }`}
                    alt="Avatar seleccionado"
                    loading="eager"
                    decoding="async"
                    onLoad={() => markAvatarLoaded(avatar)}
                  />

                  {isProcessing && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-[32px]">
                      <div className="h-6 w-6 animate-spin rounded-full border-2 border-orange-500 border-t-transparent" />
                    </div>
                  )}
                </div>

                <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1.5 rounded-xl shadow-lg border-4 border-white">
                  <Check size={14} strokeWidth={4} />
                </div>
              </div>

              <div className="w-full space-y-2.5">
                <div className="relative group">
                  <User
                    size={14}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors"
                  />

                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Tu Nombre o Alias"
                    className="h-11 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 transition-all shadow-sm"
                  />
                </div>

                <div className="relative group">
                  <Phone
                    size={14}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-orange-500 transition-colors"
                  />

                  <input
                    value={whatsapp}
                    onChange={e => setWhatsapp(e.target.value)}
                    onBlur={() => {
                      if (whatsapp.trim()) {
                        setWhatsapp(formatPhoneForInput(normalizeEcuadorPhone(whatsapp)));
                      }
                    }}
                    inputMode="tel"
                    placeholder="Ej: 098 979 5628"
                    className="h-11 w-full rounded-2xl bg-white border border-slate-100 pl-11 pr-4 text-sm font-bold text-slate-800 outline-none focus:border-orange-500 transition-all shadow-sm"
                  />
                </div>

                <div
                  className={`flex items-start gap-2 rounded-2xl px-3 py-2 border ${
                    whatsapp.trim() && phoneIsValid
                      ? 'bg-green-50 border-green-100 text-green-700'
                      : 'bg-slate-50 border-slate-100 text-slate-400'
                  }`}
                >
                  <ShieldCheck size={14} className="mt-0.5 flex-shrink-0" />
                  <p className="text-[9px] font-black uppercase leading-relaxed">
                    {whatsapp.trim() && phoneIsValid
                      ? `Número listo: ${formatPhoneForInput(normalizedWhatsapp)}`
                      : 'Luego podremos verificar este número por código para proteger tu cuenta.'}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center italic">
                Personaliza tu Avatar
              </h3>

              <div className="grid grid-cols-4 gap-3 px-1">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="aspect-square rounded-2xl border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400 bg-slate-50 active:scale-95 transition-all hover:bg-orange-50"
                >
                  <Camera size={18} />
                  <span className="text-[6px] font-black uppercase mt-0.5">Galería</span>
                </button>

                {PRESET_AVATARS.map(item => {
                  const avatarIsLoaded = loadedAvatarUrls.has(item.url);

                  return (
                    <button
                      key={item.id}
                      onClick={() => setAvatar(item.url)}
                      className={`relative aspect-square rounded-2xl border-2 transition-all active:scale-95 overflow-hidden bg-orange-50 ${
                        avatar === item.url
                          ? 'border-orange-500 ring-4 ring-orange-100 scale-105 z-10'
                          : 'border-transparent opacity-90'
                      }`}
                    >
                      {!avatarIsLoaded && (
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-amber-50 animate-pulse" />
                      )}

                      <img
                        src={item.url}
                        className={`h-full w-full object-cover transition-all duration-500 ${
                          avatarIsLoaded ? 'opacity-100 blur-0' : 'opacity-0 blur-sm'
                        }`}
                        alt={item.id}
                        loading="eager"
                        decoding="async"
                        onLoad={() => markAvatarLoaded(item.url)}
                      />

                      {avatar === item.url && <div className="absolute inset-0 bg-orange-500/10" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <div className="p-6 pt-2 bg-white flex-shrink-0 border-t border-slate-50 flex gap-3">
          <div className="flex-1 flex flex-col">
            {error && (
              <p className="text-center text-[10px] font-black text-red-500 uppercase mb-3 animate-bounce leading-tight">
                {error}
              </p>
            )}

            <button
              onClick={handleNextStep}
              className="w-full rounded-3xl bg-gradient-to-r from-orange-500 to-orange-600 h-16 text-[12px] font-black text-white shadow-xl shadow-orange-500/40 active:scale-95 uppercase tracking-widest transition-all border-b-4 border-orange-700 flex items-center justify-center gap-2"
            >
              CONTINUAR A UBICACIÓN <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }

        .hide-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>
  );
}
