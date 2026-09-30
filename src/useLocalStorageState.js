import { useState, useEffect } from "react";

export function useLocalStorageState(initialState, key) {
  const [value, setValue] = useState(function () {
    try {
      const storedValue = window.localStorage.getItem(key);
      if (storedValue === null) return initialState;

      const parsedValue = JSON.parse(storedValue);
      if (Array.isArray(initialState) && !Array.isArray(parsedValue)) {
        throw new TypeError(`Stored value for "${key}" must be an array`);
      }

      return parsedValue;
    } catch (error) {
      console.error(`Unable to read "${key}" from local storage`, error);
      return initialState;
    }
  });

  useEffect(
    function () {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        console.error(`Unable to save "${key}" to local storage`, error);
      }
    },
    [value, key],
  );

  return [value, setValue];
}
