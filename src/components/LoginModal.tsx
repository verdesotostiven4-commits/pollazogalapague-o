import React, { useRef, useState } from "react";
import { Camera, Phone, User, X, Sparkles } from "lucide-react";

type LoginData = {
  name: string;
  whatsapp: string;
  avatarUrl: string;
};

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (data: LoginData) => void;
};

const predefinedAvatars = [
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Pollazo",
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Mirador",
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Randy",
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Cliente",
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Pollo",
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Club",
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Fuego",
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Puntos",
];

export default function LoginModal({
  isOpen,
  onClose,
  onLogin,
}: LoginModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(predefinedAvatars[0]);
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;

    if (!files || files.length === 0) {
      return;
    }

    const file = files[0];

    if (!file || !(file instanceof Blob)) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Por favor selecciona una imagen válida.");
      return;
    }

    setIsProcessing(true);

    const reader = new FileReader();

    reader.onload = () => {
      const image = new Image();

      image.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 160;
        canvas.height = 160;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        ctx.clearRect(0, 0, 160, 160);
        ctx.drawImage(image, 0, 0, 160, 160);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.7);

        setAvatarUrl(compressedBase64);
        setIsProcessing(false);
      };

      image.onerror = () => {
        setIsProcessing(false);
        alert("No se pudo procesar la imagen.");
      };

      if (typeof reader.result === "string") {
        image.src = reader.result;
      } else {
        setIsProcessing(false);
      }
    };

    reader.onerror = () => {
      setIsProcessing(false);
      alert("No se pudo leer el archivo.");
    };

    reader.readAsDataURL(file);

    e.target.value = "";
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const cleanName = name.trim();
    const cleanWhatsapp = whatsapp.trim();

    if (!cleanName || !cleanWhatsapp) {
      alert("Completa tu nombre y WhatsApp.");
      return;
    }

    onLogin({
      name: cleanName,
      whatsapp: cleanWhatsapp,
      avatarUrl,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 px-4 backdrop-blur-sm">
      <div className="relative w-full max-w-md overflow-hidden rounded-[32px] bg-white p-6 shadow-2xl">
        <div className="absolute left-0 top-0 h-32 w-full bg-gradient-to-br from-orange-500 to-orange-600" />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 z-10 rounded-full bg-white/20 p-2 text-white backdrop-blur-md transition hover:bg-white/30 active:scale-95"
        >
          <X size={20} />
        </button>

        <div className="relative z-10 mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md">
            <Sparkles size={28} />
          </div>

          <h2 className="text-2xl font-black text-white">
            Pollazo El Mirador
          </h2>

          <p className="mt-1 text-sm font-medium text-orange-50">
            Ingresa al club de puntos y gana recompensas.
          </p>
        </div>

        <div className="relative z-10 rounded-[28px] bg-white p-4 shadow-xl">
          <div className="mb-5 flex flex-col items-center">
            <img
              src={avatarUrl}
              alt="Avatar seleccionado"
              className="h-28 w-28 rounded-full border-4 border-orange-500 bg-orange-50 object-cover shadow-lg"
            />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="mt-3 flex items-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:bg-orange-600 active:scale-95 disabled:opacity-60"
            >
              <Camera size={17} />
              {isProcessing ? "Procesando..." : "Subir foto"}
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          <div className="mb-5 grid grid-cols-4 gap-3">
            {predefinedAvatars.map((avatar) => {
              const isSelected = avatarUrl === avatar;

              return (
                <button
                  key={avatar}
                  type="button"
                  onClick={() => setAvatarUrl(avatar)}
                  className={`rounded-2xl border-4 bg-orange-50 p-1 transition duration-200 hover:scale-105 active:scale-95 ${
                    isSelected
                      ? "border-orange-500 shadow-md"
                      : "border-transparent hover:border-orange-200"
                  }`}
                >
                  <img
                    src={avatar}
                    alt="Avatar"
                    className="h-14 w-full rounded-xl object-cover"
                  />
                </button>
              );
            })}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-black text-gray-700">
                <User size={17} className="text-orange-500" />
                Nombre
              </span>

              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Randy"
                className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-100 px-5 text-base font-semibold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <label className="block">
              <span className="mb-2 flex items-center gap-2 text-sm font-black text-gray-700">
                <Phone size={17} className="text-orange-500" />
                WhatsApp
              </span>

              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="Ej: 0987654321"
                className="h-14 w-full rounded-2xl border border-gray-200 bg-gray-100 px-5 text-base font-semibold text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-orange-500 focus:bg-white focus:ring-4 focus:ring-orange-100"
              />
            </label>

            <button
              type="submit"
              className="mt-2 w-full rounded-2xl bg-orange-500 px-5 py-4 text-lg font-black text-white shadow-xl shadow-orange-200 transition hover:bg-orange-600 active:scale-95"
            >
              Guardar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
