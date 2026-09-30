import { useEffect, useState } from "react";

export function useMovies(query, handleSelectedMovieClose) {
  const [movies, setMovies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const KEY = "180734cf";
  useEffect(
    function () {
      const controller = new AbortController();
      let isCurrentRequest = true;

      async function fetchMovies() {
        try {
          setError("");
          setIsLoading(true);
          const res = await fetch(
            `https://www.omdbapi.com/?apikey=${KEY}&s=${encodeURIComponent(query)}`,
            { signal: controller.signal },
          );
          if (!res.ok) throw new Error(`Movie search failed (HTTP ${res.status})`);

          const data = await res.json();
          if (data.Response === "False") {
            throw new Error(data.Error || "Movie search failed");
          }

          if (!Array.isArray(data.Search)) {
            throw new Error("Movie search returned an invalid response");
          }

          if (isCurrentRequest) setMovies(data.Search);
        } catch (err) {
          if (isCurrentRequest && err.name !== "AbortError") {
            setMovies([]);
            setError(err.message || "Movie search failed");
          }
        } finally {
          if (isCurrentRequest) setIsLoading(false);
        }
      }

      if (query.length < 3) {
        setMovies([]);
        setError("");
        setIsLoading(false);
        return;
      }

      fetchMovies();

      return function () {
        isCurrentRequest = false;
        controller.abort();
        handleSelectedMovieClose();
      };
    },
    [query, handleSelectedMovieClose],
  );

  return { movies, isLoading, error };
}
