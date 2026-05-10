// src/components/LoginModal.tsx

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Image as ImageIcon } from 'lucide-react';

import { PRESET_AVATARS } from '../constants/avatars';
import { useUser } from '../hooks/useUser';

interface LoginModalProps {
  isOpen: boolean;
  onLogin: (data: {
    name: string;
    phone: string;
    avatar: string;
  }) => void;
}

const DEFAULT_AVATAR = PRESET_AVATARS[0]?.url || '';

const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLogin,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const { user } = useUser();

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);

  const [showAllAvatars, setShowAllAvatars] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setName(user?.name || '');
    setPhone(user?.phone || '');
    setAvatar(user?.avatar || DEFAULT_AVATAR);
  }, [isOpen, user]);

  const visibleAvatars = useMemo(() => {
    if (showAllAvatars) {
      return PRESET_AVATARS;
    }

    return PRESET_AVATARS.slice(0, 3);
  }, [showAllAvatars]);

  const processImage = (file: File) => {
    if (!file) return;

    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = (event) => {
      const result = event.target?.result;

      if (!result || typeof result !== 'string') {
        setIsProcessing(false);
        return;
      }

      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement('canvas');

        const SIZE = 400;

        canvas.width = SIZE;
        canvas.height = SIZE;

        const ctx = canvas.getContext('2d');

        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        const width = image.width;
        const height = image.height;

        const squareSize = Math.min(width, height);

        const sx = (width - squareSize) / 2;
        const sy = (height - squareSize) / 2;

        ctx.clearRect(0, 0, SIZE, SIZE);

        ctx.drawImage(
          image,
          sx,
          sy,
          squareSize,
          squareSize,
          0,
          0,
          SIZE,
          SIZE
        );

        const finalImage = canvas.toDataURL('image/jpeg', 0.95);

        setAvatar(finalImage);
        setIsProcessing(false);
      };

      image.onerror = () => {
        setIsProcessing(false);
      };

      image.src = result;
    };

    reader.onerror = () => {
      setIsProcessing(false);
    };

    reader.readAsDataURL(file);
  };

  const handleGalleryClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    processImage(file);

    event.target.value = '';
  };

  const handleSubmit = () => {
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();

    if (!trimmedName || !trimmedPhone || !avatar) {
      alert('Completa todos los campos para continuar.');
      return;
    }

    onLogin({
      name: trimmedName,
      phone: trimmedPhone,
      avatar,
    });
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] overflow-hidden bg-white/40 backdrop-blur-3xl">
      <div className="flex h-full w-full items-start justify-center overflow-y-auto px-4 py-4">
        <div className="relative flex w-full max-w-sm flex-col rounded-3xl border border-white/40 bg-white/70 p-4 shadow-2xl backdrop-blur-2xl">
          {/* HEADER */}
          <div className="mb-3 text-center">
            <h1 className="text-2xl font-black text-orange-600">
              ¡BIENVENIDO!
            </h1>

            <p className="mt-1 text-xs font-medium text-gray-600">
              Personaliza tu perfil para comenzar
            </p>
          </div>

          {/* AVATAR PRINCIPAL */}
          <div className="mb-3 flex justify-center">
            <div className="relative">
              <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-white bg-orange-100 shadow-xl">
                <img
                  src={avatar}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              </div>

              {isProcessing && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 backdrop-blur-sm">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
            </div>
          </div>

          {/* INPUTS */}
          <div className="space-y-2">
            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-700">
                Nombre
              </label>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tu nombre"
                className="h-11 w-full rounded-2xl border border-orange-200 bg-white/90 px-4 text-sm font-medium outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-200"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-gray-700">
                WhatsApp
              </label>

              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0999999999"
                className="h-11 w-full rounded-2xl border border-orange-200 bg-white/90 px-4 text-sm font-medium outline-none transition-all focus:border-orange-500 focus:ring-4 focus:ring-orange-200"
              />
            </div>
          </div>

          {/* AVATARES */}
          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-black text-gray-800">
                Selecciona un avatar
              </h2>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {/* BOTÓN GALERÍA */}
              <button
                type="button"
                onClick={handleGalleryClick}
                disabled={isProcessing}
                className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 bg-white/80 transition-all hover:scale-105 hover:border-orange-500 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <ImageIcon className="h-5 w-5 text-orange-600" />

                <span className="mt-1 text-[10px] font-bold text-orange-700">
                  Galería
                </span>
              </button>

              {/* AVATARES */}
              {visibleAvatars.map((item) => {
                const isSelected = avatar === item.url;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setAvatar(item.url)}
                    className={`relative aspect-square overflow-hidden rounded-2xl border-4 transition-all ${
                      isSelected
                        ? 'scale-105 border-orange-500 shadow-lg'
                        : 'border-transparent hover:scale-105'
                    }`}
                  >
                    <img
                      src={item.url}
                      alt={item.id}
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>

            {/* VER MÁS */}
            {PRESET_AVATARS.length > 3 && (
              <button
                type="button"
                onClick={() =>
                  setShowAllAvatars((prev) => !prev)
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-100 py-3 text-xs font-black uppercase tracking-wide text-orange-700 transition-all hover:bg-orange-200"
              >
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${
                    showAllAvatars ? 'rotate-180' : ''
                  }`}
                />

                {showAllAvatars
                  ? 'Ocultar avatares'
                  : 'Ver más avatares'}
              </button>
            )}
          </div>

          {/* INPUT FILE */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="hidden"
          />

          {/* ESPACIADO PARA BOTÓN FIJO */}
          <div className="h-24" />
        </div>
      </div>

      {/* BOTÓN FIJO INFERIOR */}
      <div className="fixed bottom-0 left-0 right-0 z-[10000] px-4 pb-4">
        <div className="mx-auto w-full max-w-sm">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isProcessing}
            className="flex h-14 w-full items-center justify-center rounded-2xl border-b-4 border-orange-700 bg-gradient-to-b from-orange-500 to-orange-600 px-6 text-sm font-black uppercase tracking-wide text-white shadow-2xl transition-all active:translate-y-[2px] active:border-b-2 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isProcessing
              ? 'Procesando imagen...'
              : '¡COMENZAR AVENTURA!'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginModal;
