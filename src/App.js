import { useEffect, useRef, useState } from "react";
import StarRating from "./StarRating";
import { useMovies } from "./useMovies";
import { useLocalStorageState } from "./useLocalStorageState";

const average = (arr) =>
  arr.reduce((acc, cur, i, arr) => acc + cur / arr.length, 0);

const KEY = "180734cf";

export default function App() {
  const [selectedId, setSelectedId] = useState(null);
  const [query, setQuery] = useState("");

  const { movies, isLoading, error } = useMovies(
    query,
    handleSelectedMovieClose,
  );

  const [watched, setWatched] = useLocalStorageState([], "watched");

  function handleSelectMovie(id) {
    setSelectedId(id);
  }
  function handleSelectedMovieClose() {
    setSelectedId(null);
  }
  function handleAddWatch(movie) {
    setWatched((watched) => [...watched, movie]);
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
    <li onClick={() => onSelectMovie(movie.imdbID)} key={movie.imdbID}>
      <img src={movie.Poster} alt={`${movie.Title} poster`} />
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
      async function fetchSelectedMovieDetails() {
        try {
          setIsLoading(true);
          const res = await fetch(
            `http://www.omdbapi.com/?apikey=${KEY}&i=${selectedId}`,
          );

          const data = await res.json();
          setMovie(data);
          setIsLoading(false);
        } catch (err) {
          setError(err.message);
          throw new Error("something went wrong while fetching movie");
        } finally {
          setError("");
        }
      }
      fetchSelectedMovieDetails();
    },
    [selectedId],
  );

  function handleAdd() {
    const newWatchedMovie = {
      imdbid: selectedId,
      title: movie.Title,
      year: movie.Year,
      poster: movie.Poster,
      imdbRating: Number(movie.imdbRating),
      runtime: Number(movie.Runtime.split(" ").at(0)),
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
            <img
              src={`${movie.Poster}`}
              alt={`poster of movie:${movie.Title}`}
            />
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
                  size="25"
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
    <li key={movie.imdbid}>
      <img src={movie.poster} alt={`${movie.title} poster`} />
      <h3>{movie.title}</h3>
      <div>
        <p>
          <span>⭐️</span>
          <span>{movie.imdbRating}</span>
        </p>
        <p>
          <span>🌟</span>
          <span>{movie.userRating}</span>
        </p>
        <p>
          <span>⏳</span>
          <span>{movie.runtime} min</span>
        </p>
      </div>
    </li>
  );
}

function WatchedMovieList({ watched }) {
  return (
    <ul className="list">
      {watched.map((movie) => (
        <WatchedMovie movie={movie} key={movie.imdbID} />
      ))}
    </ul>
  );
}
