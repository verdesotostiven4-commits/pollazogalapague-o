import { createContext, useContext, useState, ReactNode } from 'react';

interface DarkModeContextType {
  dark: boolean;
  toggleDark: () => void;
}

const DarkModeContext = createContext<DarkModeContextType>({ dark: false, toggleDark: () => {} });

export function DarkModeProvider({ children }: { children: ReactNode }) {
  const [dark, setDark] = useState(false);
  const toggleDark = () => setDark(d => !d);
  return (
    <DarkModeContext.Provider value={{ dark, toggleDark }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}
