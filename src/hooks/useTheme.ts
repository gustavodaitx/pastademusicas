import { useContext } from 'react';
import { ThemeContext } from '../contexts/theme-context';
import { ThemeContextType } from '../types/theme';

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
