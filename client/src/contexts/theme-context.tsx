import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
  children: ReactNode;
}

// Check if we're in a Chrome extension environment
const isChromeExtension = typeof chrome !== 'undefined' && chrome.storage !== undefined;

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  const [theme, setTheme] = useState<Theme>('dark');

  useEffect(() => {
    // Load theme from storage if in extension context
    if (isChromeExtension) {
      try {
        chrome.storage.local.get(['theme'], (result) => {
          if (result.theme) {
            setTheme(result.theme);
          }
        });
      } catch (error) {
        console.error('Error accessing chrome storage:', error);
      }
    } else {
      // For web environment, try to load from localStorage
      const savedTheme = localStorage.getItem('theme') as Theme | null;
      if (savedTheme) {
        setTheme(savedTheme);
      }
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    
    // Save theme preference
    if (isChromeExtension) {
      try {
        chrome.storage.local.set({ theme: newTheme });
      } catch (error) {
        console.error('Error saving to chrome storage:', error);
      }
    } else {
      // For web environment
      localStorage.setItem('theme', newTheme);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={theme === 'dark' ? 'dark' : 'light'}>
        {children}
      </div>
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
