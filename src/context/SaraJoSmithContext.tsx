'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { siteConfig, SiteConfig } from '@/data/saraJoSmithConfig';

export type DeviceType = 'all' | 'desktop' | 'tablet' | 'mobile';

export interface DeviceFontSize {
  all?: number;
  desktop?: number;
  tablet?: number;
  mobile?: number;
}

export type FontSizeOverrides = Record<string, DeviceFontSize>;

export interface SelectedElementInfo {
  path: string;
  elementKey: string;
  label: string;
  text: string;
  defaultSizePx?: number;
  multiline?: boolean;
}

interface SaraJoSmithContextType {
  config: SiteConfig;
  fontSizeOverrides: FontSizeOverrides;
  isAdmin: boolean;
  isEditModeActive: boolean;
  setIsEditModeActive: (active: boolean) => void;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  activeDeviceView: DeviceType;
  setActiveDeviceView: (device: DeviceType) => void;
  targetEditDevice: DeviceType;
  setTargetEditDevice: (device: DeviceType) => void;
  selectedElement: SelectedElementInfo | null;
  setSelectedElement: (element: SelectedElementInfo | null) => void;
  customLinks: Record<string, string>;
  updateLink: (linkKey: string, newUrl: string) => void;
  updateText: (path: string, newText: string) => void;
  updateFontSize: (elementKey: string, sizePx: number, device?: DeviceType) => void;
  getEffectiveFontSize: (elementKey: string, defaultSizePx?: number) => number | undefined;
  updateImage: (path: string, newUrl: string) => void;
  uploadLocalImage: (path: string, file: File) => Promise<string>;
  saveConfig: () => void;
  resetToDefaults: () => void;
  isSavedToastVisible: boolean;
  activeImageEdit: { path: string; currentUrl: string; label: string } | null;
  setActiveImageEdit: (data: { path: string; currentUrl: string; label: string } | null) => void;
}

const SaraJoSmithContext = createContext<SaraJoSmithContextType | undefined>(undefined);

function setDeep(obj: any, path: string, value: any): any {
  const cloned = JSON.parse(JSON.stringify(obj));
  const keys = path.split('.');
  let current = cloned;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    if (!current[key]) {
      current[key] = !isNaN(Number(keys[i + 1])) ? [] : {};
    }
    current = current[key];
  }
  current[keys[keys.length - 1]] = value;
  return cloned;
}

export function getDeep(obj: any, path: string, fallback: any = ''): any {
  if (!obj || !path) return fallback;
  const keys = path.split('.');
  let current = obj;
  for (const key of keys) {
    if (current === undefined || current === null) return fallback;
    current = current[key];
  }
  return current !== undefined ? current : fallback;
}

interface ProviderProps {
  children: React.ReactNode;
  isAdmin?: boolean;
}

export const SaraJoSmithProvider: React.FC<ProviderProps> = ({
  children,
  isAdmin = false,
}) => {
  const [config, setConfig] = useState<SiteConfig>(siteConfig);
  const [fontSizeOverrides, setFontSizeOverrides] = useState<FontSizeOverrides>({});
  const [customLinks, setCustomLinks] = useState<Record<string, string>>({});
  const [isEditModeActive, setIsEditModeActive] = useState<boolean>(isAdmin);
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(true);
  const [activeDeviceView, setActiveDeviceView] = useState<DeviceType>('all');
  const [targetEditDevice, setTargetEditDevice] = useState<DeviceType>('all');
  const [selectedElement, setSelectedElement] = useState<SelectedElementInfo | null>(null);
  const [isSavedToastVisible, setIsSavedToastVisible] = useState<boolean>(false);
  const [activeImageEdit, setActiveImageEdit] = useState<{ path: string; currentUrl: string; label: string } | null>(null);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Client hydration from localStorage
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedConfig = localStorage.getItem('sjs_custom_site_config');
      if (savedConfig) {
        setConfig(JSON.parse(savedConfig));
      }
      const savedFontSizes = localStorage.getItem('sjs_device_font_sizes') || localStorage.getItem('sjs_font_sizes');
      if (savedFontSizes) {
        const parsed = JSON.parse(savedFontSizes);
        // Normalize older number format into DeviceFontSize object
        const normalized: FontSizeOverrides = {};
        for (const [k, v] of Object.entries(parsed)) {
          if (typeof v === 'number') {
            normalized[k] = { all: v };
          } else if (typeof v === 'object') {
            normalized[k] = v as DeviceFontSize;
          }
        }
        setFontSizeOverrides(normalized);
      }
      const savedLinks = localStorage.getItem('sjs_custom_links');
      if (savedLinks) {
        setCustomLinks(JSON.parse(savedLinks));
      }
    } catch (err) {
      console.warn('Error reading customized Sara Jo Smith config from localStorage:', err);
    }
  }, []);

  const updateText = useCallback((path: string, newText: string) => {
    setConfig((prev) => setDeep(prev, path, newText));
    if (selectedElement && selectedElement.path === path) {
      setSelectedElement((prev) => prev ? { ...prev, text: newText } : null);
    }
  }, [selectedElement]);

  const updateLink = useCallback((linkKey: string, newUrl: string) => {
    setCustomLinks((prev) => ({
      ...prev,
      [linkKey]: newUrl,
    }));
  }, []);

  const updateFontSize = useCallback((elementKey: string, sizePx: number, device?: DeviceType) => {
    const target = device || targetEditDevice;
    setFontSizeOverrides((prev) => {
      const current = prev[elementKey] || {};
      if (target === 'all') {
        return {
          ...prev,
          [elementKey]: {
            ...current,
            all: sizePx,
          },
        };
      }
      return {
        ...prev,
        [elementKey]: {
          ...current,
          [target]: sizePx,
        },
      };
    });
  }, [targetEditDevice]);

  // Compute effective font size based on current viewport
  const getEffectiveFontSize = useCallback((elementKey: string, defaultSizePx?: number): number | undefined => {
    const overrides = fontSizeOverrides[elementKey];
    if (!overrides) return defaultSizePx;

    const effectiveView = activeDeviceView === 'all'
      ? (windowWidth < 768 ? 'mobile' : windowWidth < 1024 ? 'tablet' : 'desktop')
      : activeDeviceView;

    if (effectiveView === 'mobile' && overrides.mobile !== undefined) {
      return overrides.mobile;
    }
    if (effectiveView === 'tablet' && overrides.tablet !== undefined) {
      return overrides.tablet;
    }
    if (effectiveView === 'desktop' && overrides.desktop !== undefined) {
      return overrides.desktop;
    }

    // Default 'all' fallback
    if (overrides.all !== undefined) {
      return overrides.all;
    }

    return defaultSizePx;
  }, [fontSizeOverrides, activeDeviceView, windowWidth]);

  const updateImage = useCallback((path: string, newUrl: string) => {
    setConfig((prev) => setDeep(prev, path, newUrl));
    setActiveImageEdit(null);
  }, []);

  // Instant local file upload via FileReader (dataURL in browser)
  const uploadLocalImage = useCallback(async (path: string, file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          updateImage(path, result);
          resolve(result);
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File reading error'));
      reader.readAsDataURL(file);
    });
  }, [updateImage]);

  const saveConfig = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('sjs_custom_site_config', JSON.stringify(config));
      localStorage.setItem('sjs_device_font_sizes', JSON.stringify(fontSizeOverrides));
      localStorage.setItem('sjs_custom_links', JSON.stringify(customLinks));
      setIsSavedToastVisible(true);
      setTimeout(() => {
        setIsSavedToastVisible(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to save config to localStorage:', err);
    }
  }, [config, fontSizeOverrides, customLinks]);

  const resetToDefaults = useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem('sjs_custom_site_config');
      localStorage.removeItem('sjs_device_font_sizes');
      localStorage.removeItem('sjs_font_sizes');
      localStorage.removeItem('sjs_custom_links');
      setConfig(siteConfig);
      setFontSizeOverrides({});
      setCustomLinks({});
      setSelectedElement(null);
      setIsSavedToastVisible(true);
      setTimeout(() => {
        setIsSavedToastVisible(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to reset config:', err);
    }
  }, []);

  return (
    <SaraJoSmithContext.Provider
      value={{
        config,
        fontSizeOverrides,
        isAdmin,
        isEditModeActive: isAdmin && isEditModeActive,
        setIsEditModeActive,
        isSidebarOpen,
        setIsSidebarOpen,
        activeDeviceView,
        setActiveDeviceView,
        targetEditDevice,
        setTargetEditDevice,
        selectedElement,
        setSelectedElement,
        customLinks,
        updateLink,
        updateText,
        updateFontSize,
        getEffectiveFontSize,
        updateImage,
        uploadLocalImage,
        saveConfig,
        resetToDefaults,
        isSavedToastVisible,
        activeImageEdit,
        setActiveImageEdit,
      }}
    >
      {children}
    </SaraJoSmithContext.Provider>
  );
};

export const useSaraJoSmith = (): SaraJoSmithContextType => {
  const context = useContext(SaraJoSmithContext);
  if (!context) {
    throw new Error('useSaraJoSmith must be used within a SaraJoSmithProvider');
  }
  return context;
};
