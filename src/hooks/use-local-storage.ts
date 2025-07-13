// src/hooks/use-local-storage.ts
import { useState, useCallback, useEffect } from 'react';

/**
 * Hook for persisting state in localStorage
 * @param key - The key to store the value under
 * @param defaultValue - The default value if nothing is stored
 * @returns [value, setValue, removeValue]
 */
export function useLocalStorage<T>(
    key: string,
    defaultValue: T
): [T, (value: T | ((prev: T) => T)) => void, () => void] {
    // Get initial value from localStorage or use default
    const getStoredValue = useCallback((): T => {
        if (typeof window === 'undefined') {
            return defaultValue;
        }

        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.error(`Error reading localStorage key "${key}":`, error);
            return defaultValue;
        }
    }, [key, defaultValue]);

    const [storedValue, setStoredValue] = useState<T>(getStoredValue);

    // Update localStorage when value changes
    const setValue = useCallback((value: T | ((prev: T) => T)) => {
        try {
            // Allow value to be a function so we have same API as useState
            const valueToStore = value instanceof Function ? value(storedValue) : value;

            setStoredValue(valueToStore);

            if (typeof window !== 'undefined') {
                window.localStorage.setItem(key, JSON.stringify(valueToStore));
            }
        } catch (error) {
            console.error(`Error setting localStorage key "${key}":`, error);
        }
    }, [key, storedValue]);

    // Remove value from localStorage
    const removeValue = useCallback(() => {
        try {
            setStoredValue(defaultValue);

            if (typeof window !== 'undefined') {
                window.localStorage.removeItem(key);
            }
        } catch (error) {
            console.error(`Error removing localStorage key "${key}":`, error);
        }
    }, [key, defaultValue]);

    // Handle storage changes from other tabs
    useEffect(() => {
        const handleStorageChange = (e: StorageEvent) => {
            if (e.key === key && e.newValue !== null) {
                try {
                    setStoredValue(JSON.parse(e.newValue));
                } catch (error) {
                    console.error(`Error parsing localStorage change for key "${key}":`, error);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [key]);

    return [storedValue, setValue, removeValue];
}

// Convenience hook for boolean values
export function useLocalStorageBoolean(
    key: string,
    defaultValue = false
): [boolean, () => void, () => void] {
    const [value, setValue] = useLocalStorage(key, defaultValue);

    const toggle = useCallback(() => {
        setValue(prev => !prev);
    }, [setValue]);

    const reset = useCallback(() => {
        setValue(defaultValue);
    }, [setValue, defaultValue]);

    return [value, toggle, reset];
}