import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom";
import App from "./App";

const movies = [
  {
    imdbID: "tt0133093",
    Title: "The Matrix",
    Year: "1999",
    Poster: "N/A",
  },
  {
    imdbID: "tt1375666",
    Title: "Inception",
    Year: "2010",
    Poster: "N/A",
  },
];

function response(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data,
  };
}

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn(async (url) => {
    const requestUrl = new URL(url);
    const movieId = requestUrl.searchParams.get("i");

    if (movieId) {
      const movie = movies.find((item) => item.imdbID === movieId);
      return response({
        Response: "True",
        ...movie,
        Released: "01 Jan 2000",
        Runtime: "120 min",
        imdbRating: "8.0",
        Actors: "Test Actor",
        Plot: "A test plot.",
      });
    }

    return response({ Response: "True", Search: movies });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("searches once, adds movies once, and resets ratings for another movie", async () => {
  render(<App />);

  fireEvent.change(screen.getByPlaceholderText("Search movies..."), {
    target: { value: "matrix" },
  });

  fireEvent.click(await screen.findByText("The Matrix"));
  expect(
    await screen.findByRole("button", { name: "Rate 10 out of 10" }),
  ).toBeInTheDocument();
  await waitFor(() => expect(global.fetch).toHaveBeenCalledTimes(2));

  fireEvent.click(screen.getByRole("button", { name: "Rate 8 out of 10" }));
  fireEvent.click(screen.getByRole("button", { name: "+ Add to list" }));
  expect(await screen.findByText("1 movies")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: /The Matrix/ }));
  expect(
    await screen.findByText("A test plot."),
  ).toBeInTheDocument();
  expect(
    screen.queryByRole("button", { name: "Rate 1 out of 10" }),
  ).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "<--" }));
  fireEvent.click(screen.getByText("Inception"));
  expect(
    await screen.findByRole("button", { name: "Rate 1 out of 10" }),
  ).toBeInTheDocument();
  expect(global.fetch).toHaveBeenCalledTimes(4);
});

test("shows API errors and recovers from invalid saved state", async () => {
  const consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  window.localStorage.setItem("watched", "null");
  global.fetch.mockResolvedValue(
    response({ Response: "False", Error: "Movie not found!" }),
  );

  render(<App />);

  expect(screen.getByText("0 movies")).toBeInTheDocument();
  expect(consoleError).toHaveBeenCalled();

  fireEvent.change(screen.getByPlaceholderText("Search movies..."), {
    target: { value: "unknown" },
  });
  expect(await screen.findByText(/Movie not found/)).toBeInTheDocument();
});

test("keeps movie-detail API errors visible", async () => {
  global.fetch.mockImplementation(async (url) => {
    const requestUrl = new URL(url);
    if (requestUrl.searchParams.has("i")) {
      return response({ Response: "False", Error: "Movie not found!" });
    }
    return response({ Response: "True", Search: movies });
  });

  render(<App />);
  fireEvent.change(screen.getByPlaceholderText("Search movies..."), {
    target: { value: "matrix" },
  });
  fireEvent.click(await screen.findByText("The Matrix"));

  expect(await screen.findByText(/Movie not found/)).toBeInTheDocument();
});
