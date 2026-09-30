import { useCallback, useEffect, useRef, useState } from "react";
import StarRating from "./StarRating";
import { useMovies } from "./useMovies";
import { useLocalStorageState } from "./useLocalStorageState";

const average = (arr) => {
  const validValues = arr.filter(Number.isFinite);
  return validValues.length
    ? validValues.reduce((total, value) => total + value, 0) /
        validValues.length
    : 0;
};

const KEY = "180734cf";

export default function App() {
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");

  const handleSelectedMovieClose = useCallback(() => {
    setSelectedId(null);
  }, []);

  const { movies, isLoading, error } = useMovies(
    query,
    handleSelectedMovieClose,
  );

  const [watched, setWatched] = useLocalStorageState([], "watched");

  function handleSelectMovie(id) {
    setSelectedId(id);
  }

  function handleAddWatch(movie) {
    setWatched((watched) =>
      watched.some((watchedMovie) => watchedMovie.imdbid === movie.imdbid)
        ? watched
        : [...watched, movie],
    );
  }

  return (
    <>
      <NavBar>
        <SearchBar query={query} setQuery={setQuery} />
        <NumResults movies={movies} />
      </NavBar>
      <Main>
        <MovieBox>
          {isLoading && <Loader />}
          {!isLoading && !error && (
            <MovieList movies={movies} onSelectMovie={handleSelectMovie} />
          )}
          {error && <ErrMessage message={error} />}
        </MovieBox>
        <MovieBox>
          {selectedId ? (
            <SelectedMovieDetails
              key={selectedId}
              selectedId={selectedId}
              goBack={handleSelectedMovieClose}
              onAddWatched={handleAddWatch}
              watched={watched}
            />
          ) : (
            <>
              <OverviewBox watched={watched} />
              <WatchedMovieList watched={watched} />
            </>
          )}
        </MovieBox>
      </Main>
    </>
  );
}

function Loader() {
  return <p className="loader">Loading...</p>;
}

function ErrMessage({ message }) {
  return <p className="error">👎 {message}</p>;
}

function NavBar({ children }) {
  return (
    <nav className="nav-bar">
      <Logo />
      {children}
    </nav>
  );
}
function Main({ children }) {
  return <main className="main">{children}</main>;
}

function NumResults({ movies }) {
  return (
    <p className="num-results">
      Found <strong>{movies.length}</strong> results
    </p>
  );
}

function Logo() {
  return (
    <div className="logo">
      <span role="img">🍿</span>
      <h1>usePopcorn</h1>
    </div>
  );
}

function SearchBar({ query, setQuery }) {
  const inputEl = useRef(null);

  useEffect(
    function () {
      function callback(e) {
        if (document.activeElement === inputEl.current) return;

        if (e.code === "Enter") {
          inputEl.current.focus();
          setQuery("");
        }
      }
      document.addEventListener("keydown", callback);

      return () => document.removeEventListener("keydown", callback);
    },
    [setQuery],
  );

  return (
    <input
      className="search"
      type="text"
      placeholder="Search movies..."
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      ref={inputEl}
    />
  );
}

function MovieBox({ children }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="box">
      <button className="btn-toggle" onClick={() => setIsOpen((open) => !open)}>
        {isOpen ? "–" : "+"}
      </button>
      {isOpen && <>{children}</>}
    </div>
  );
}

function MovieList({ movies, onSelectMovie }) {
  return (
    <ul className="list list-movies">
      {movies?.map((movie) => (
        <Movie movie={movie} onSelectMovie={onSelectMovie} key={movie.imdbID} />
      ))}
    </ul>
  );
}

function Movie({ movie, onSelectMovie }) {
  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => onSelectMovie(movie.imdbID)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelectMovie(movie.imdbID);
        }
      }}
    >
      {movie.Poster && movie.Poster !== "N/A" && (
        <img src={movie.Poster} alt={`${movie.Title} poster`} />
      )}
      <h3>{movie.Title}</h3>
      <div>
        <p>
          <span>🗓</span>
          <span>{movie.Year}</span>
        </p>
      </div>
    </li>
  );
}

function SelectedMovieDetails({ selectedId, goBack, onAddWatched, watched }) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [userRating, setUserRating] = useState(null);
  const [movie, setMovie] = useState({});

  const countRef = useRef(0);
  useEffect(
    function () {
      if (userRating) countRef.current = countRef.current + 1;
    },
    [userRating],
  );

  useEffect(
    function () {
      if (!movie.Title) return;
      document.title = `MOVIE: ${movie.Title}`;
      return function () {
        document.title = "usePopcorn";
      };
    },
    [movie.Title],
  );

  useEffect(
    function () {
      const controller = new AbortController();
      let isCurrentRequest = true;

      async function fetchSelectedMovieDetails() {
        try {
          setIsLoading(true);
          setError("");
          setMovie({});
          const res = await fetch(
            `https://www.omdbapi.com/?apikey=${KEY}&i=${encodeURIComponent(selectedId)}`,
            { signal: controller.signal },
          );
          if (!res.ok) {
            throw new Error(`Movie details failed (HTTP ${res.status})`);
          }

          const data = await res.json();
          if (data.Response === "False") {
            throw new Error(data.Error || "Movie details could not be loaded");
          }
          if (!data.Title) {
            throw new Error("Movie details returned an invalid response");
          }

          if (isCurrentRequest) setMovie(data);
        } catch (err) {
          if (isCurrentRequest && err.name !== "AbortError") {
            setError(err.message || "Movie details could not be loaded");
          }
        } finally {
          if (isCurrentRequest) setIsLoading(false);
        }
      }

      fetchSelectedMovieDetails();

      return function () {
        isCurrentRequest = false;
        controller.abort();
      };
    },
    [selectedId],
  );

  function handleAdd() {
    const runtime = Number.parseInt(movie.Runtime, 10);
    const imdbRating = Number.parseFloat(movie.imdbRating);
    const newWatchedMovie = {
      imdbid: selectedId,
      title: movie.Title,
      year: movie.Year,
      poster: movie.Poster,
      imdbRating,
      runtime,
      userRating: userRating,
      countRatingDecisions: countRef.current,
    };
    onAddWatched(newWatchedMovie);
    goBack();
  }

  return (
    <>
      {isLoading && <Loader />}
      {!isLoading && error && <ErrMessage message={error} />}
      {!isLoading && !error && (
        <div className="details">
          <header>
            <button onClick={goBack} className="btn-back">
              {"<--"}
            </button>
            {movie.Poster && movie.Poster !== "N/A" && (
              <img
                src={movie.Poster}
                alt={`poster of movie:${movie.Title}`}
              />
            )}
            <div className="details-overview">
              <h2>{movie.Title}</h2>
              <p>
                {movie.Released} | {movie.Runtime} |
              </p>
              <p>⭐{movie.imdbRating} imdb rating</p>
              <p>{movie.Actors}</p>
            </div>
          </header>
          <section>
            {watched.filter((movie) => movie.imdbid === selectedId).length ===
              0 && (
              <div className="rating">
                <StarRating
                  maxRating={10}
                  size={25}
                  onSetRating={setUserRating}
                />
                {userRating > 0 && (
                  <button className="btn-add" onClick={handleAdd}>
                    + Add to list
                  </button>
                )}
              </div>
            )}
            <p>{movie.Plot}</p>
          </section>
        </div>
      )}
    </>
  );
}

function OverviewBox({ watched }) {
  const avgImdbRating = average(watched.map((movie) => movie.imdbRating));
  const avgUserRating = average(watched.map((movie) => movie.userRating));
  const avgRuntime = average(watched.map((movie) => movie.runtime));

  return (
    <div className="summary">
      <h2>Movies you watched</h2>
      <div>
        <p>
          <span>#️⃣</span>
          <span>{watched.length} movies</span>
        </p>
        <p>
          <span>⭐️</span>
          <span>{Math.round(avgImdbRating)}</span>
        </p>
        <p>
          <span>🌟</span>
          <span>{Math.round(avgUserRating)}</span>
        </p>
        <p>
          <span>⏳</span>
          <span>{Math.round(avgRuntime)} min</span>
        </p>
      </div>
    </div>
  );
}

function WatchedMovie({ movie }) {
  return (
    <li>
      {movie.poster && movie.poster !== "N/A" && (
        <img src={movie.poster} alt={`${movie.title} poster`} />
      )}
      <h3>{movie.title}</h3>
      <div>
        <p>
          <span>⭐️</span>
          <span>
            {Number.isFinite(movie.imdbRating) ? movie.imdbRating : "N/A"}
          </span>
        </p>
        <p>
          <span>🌟</span>
          <span>{movie.userRating}</span>
        </p>
        <p>
          <span>⏳</span>
          <span>
            {Number.isFinite(movie.runtime) ? `${movie.runtime} min` : "N/A"}
          </span>
        </p>
      </div>
    </li>
  );
}

function WatchedMovieList({ watched }) {
  return (
    <ul className="list">
      {watched.map((movie) => (
        <WatchedMovie movie={movie} key={movie.imdbid} />
      ))}
    </ul>
  );
}
