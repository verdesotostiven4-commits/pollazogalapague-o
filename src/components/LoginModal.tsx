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
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Randy",
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Leo",
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Luna",
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Max",
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Nina",
  "https://api.dicebear.com/8.x/adventurer/svg?seed=Club",
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
        canvas.width = 32;
        canvas.height = 32;

        const ctx = canvas.getContext("2d");

        if (!ctx) {
          setIsProcessing(false);
          return;
        }

        ctx.clearRect(0, 0, 32, 32);
        ctx.drawImage(image, 0, 0, 32, 32);

        const compressedBase64 = canvas.toDataURL("image/jpeg", 0.5);

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
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
      <div className="relative w-full max-w-md rounded-[40px] bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 rounded-full bg-gray-100 p-2 text-gray-600 transition hover:bg-gray-200"
        >
          <X size={20} />
        </button>

        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-yellow-600">
            <Sparkles size={28} />
          </div>

          <h2 className="text-2xl font-black text-gray-900">
            Club de Puntos
          </h2>

          <p className="mt-1 text-sm text-gray-500">
            Ingresa tus datos para acumular recompensas.
          </p>
        </div>

        <div className="mb-5 flex flex-col items-center">
          <img
            src={avatarUrl}
            alt="Avatar seleccionado"
            className="h-24 w-24 rounded-full border-4 border-yellow-300 object-cover shadow-md"
          />

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            className="mt-3 flex items-center gap-2 rounded-full bg-gray-900 px-4 py-2 text-sm font-bold text-white transition hover:bg-gray-800 disabled:opacity-60"
          >
            <Camera size={16} />
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

        <div className="mb-5 grid grid-cols-6 gap-2">
          {predefinedAvatars.map((avatar) => (
            <button
              key={avatar}
              type="button"
              onClick={() => setAvatarUrl(avatar)}
              className={`rounded-full border-2 p-1 transition ${
                avatarUrl === avatar
                  ? "border-yellow-400 scale-105"
                  : "border-transparent hover:border-gray-300"
              }`}
            >
              <img
                src={avatar}
                alt="Avatar"
                className="h-10 w-10 rounded-full object-cover"
              />
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-700">
              <User size={16} />
              Nombre
            </span>

            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Randy"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-yellow-400 focus:bg-white"
            />
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-2 text-sm font-bold text-gray-700">
              <Phone size={16} />
              WhatsApp
            </span>

            <input
              type="tel"
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="Ej: 0987654321"
              className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-yellow-400 focus:bg-white"
            />
          </label>

          <button
            type="submit"
            className="w-full rounded-2xl bg-yellow-400 px-5 py-4 font-black text-gray-900 shadow-lg transition hover:bg-yellow-300 active:scale-[0.98]"
          >
            Entrar al club
          </button>
        </form>
      </div>
    </div>
  );
}
