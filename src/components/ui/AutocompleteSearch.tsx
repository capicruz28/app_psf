// src/components/ui/AutocompleteSearch.tsx

import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useDebounce } from '../../hooks/useDebounce';

export interface AutocompleteOption {
  value: string;
  label: string;
  subtitle?: string;
}

interface AutocompleteSearchProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (option: AutocompleteOption) => void;
  onSearch: (query: string) => Promise<AutocompleteOption[]>;
  placeholder?: string;
  label?: string;
  disabled?: boolean;
  required?: boolean;
  minChars?: number;
  debounceMs?: number;
}

const AutocompleteSearch: React.FC<AutocompleteSearchProps> = ({
  value,
  onChange,
  onSelect,
  onSearch,
  placeholder = 'Buscar...',
  label,
  disabled = false,
  required = false,
  minChars = 2,
  debounceMs = 400,
}) => {
  const [options, setOptions] = useState<AutocompleteOption[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const debouncedValue = useDebounce(value, debounceMs);
  const previousDebouncedValueRef = useRef<string>(debouncedValue);
  const isUserTypingRef = useRef<boolean>(false);

  // Buscar cuando el valor debounced cambia
  useEffect(() => {
    const debouncedChanged = debouncedValue !== previousDebouncedValueRef.current;
    previousDebouncedValueRef.current = debouncedValue;
    
    // Si el valor debounced cambió y tiene suficientes caracteres, buscar
    if (debouncedChanged && debouncedValue.trim().length >= minChars) {
      setIsSearching(true);
      setIsLoading(true);
      onSearch(debouncedValue.trim())
        .then((results) => {
          setOptions(results);
          setIsOpen(true);
          setHighlightedIndex(-1);
        })
        .catch((error) => {
          console.error('Error en búsqueda:', error);
          setOptions([]);
        })
        .finally(() => {
          setIsLoading(false);
        });
    } else if (debouncedValue.trim().length < minChars) {
      // Si el valor es muy corto, limpiar
      setOptions([]);
      setIsOpen(false);
      setIsSearching(false);
    }
  }, [debouncedValue, onSearch, minChars]);

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option: AutocompleteOption) => {
    isUserTypingRef.current = false;
    onSelect(option);
    setIsOpen(false);
    setOptions([]);
    setIsSearching(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || options.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < options.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelect(options[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleClear = () => {
    onChange('');
    setOptions([]);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            isUserTypingRef.current = true;
            onChange(e.target.value);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            // Si hay opciones disponibles, abrir
            if (options.length > 0) {
              setIsOpen(true);
            } else if (value.trim().length >= minChars) {
              // Si hay un valor pero no opciones, buscar
              setIsSearching(true);
              setIsLoading(true);
              onSearch(value.trim())
                .then((results) => {
                  setOptions(results);
                  setIsOpen(true);
                  setHighlightedIndex(-1);
                })
                .catch((error) => {
                  console.error('Error en búsqueda:', error);
                  setOptions([]);
                })
                .finally(() => {
                  setIsLoading(false);
                });
            }
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {value && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Dropdown de resultados */}
      {isOpen && (
        <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-auto">
          {isLoading ? (
            <div className="p-4 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-indigo-600" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Buscando...</p>
            </div>
          ) : options.length === 0 ? (
            // Solo mostrar mensaje si estamos en modo búsqueda activa
            isSearching && value.trim().length >= minChars && isUserTypingRef.current && (
              <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                {value.trim().length < minChars
                  ? `Escribe al menos ${minChars} caracteres para buscar`
                  : 'No se encontraron resultados'}
              </div>
            )
          ) : (
            <ul className="py-1">
              {options.map((option, index) => (
                <li
                  key={option.value}
                  onClick={() => handleSelect(option)}
                  className={`
                    px-4 py-2 cursor-pointer transition-colors
                    ${index === highlightedIndex
                      ? 'bg-indigo-100 dark:bg-indigo-900 text-indigo-900 dark:text-indigo-100'
                      : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-900 dark:text-gray-100'
                    }
                  `}
                >
                  <div className="font-medium">{option.label}</div>
                  {option.subtitle && (
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {option.subtitle}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

export default AutocompleteSearch;
