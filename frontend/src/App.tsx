import { useCallback, useEffect, useState } from 'react';
import { api, type Cinema, type Movie, type MoviePatch, type NewCinema, type NewMovie } from './api';
import { ErrorBanner } from './components/Feedback';
import { Icon } from './components/Icons';
import MoviesView from './views/MoviesView';
import RewatchView from './views/RewatchView';
import BookingView from './views/BookingView';
import { sortByName, sortByTitle } from './utils';

type Tab = 'movies' | 'rewatch' | 'booking';
type Toast = { message: string; tone: 'success' | 'error' };

const tabs = [
  { id: 'movies', label: 'Movies', icon: 'film' },
  { id: 'rewatch', label: 'Rewatch plan', icon: 'play' },
  { id: 'booking', label: 'Watch party', icon: 'ticket' },
] as const;

const headings: Record<Tab, { eyebrow: string; title: string; accent: string; subtitle: string }> = {
  movies: {
    eyebrow: '01 / YOUR COLLECTION',
    title: 'Assemble the', accent: 'timeline.',
    subtitle: 'Build your movie collection, connect the storylines, and keep every prerequisite in check.',
  },
  rewatch: {
    eyebrow: '02 / THE MISSION',
    title: 'Watch in the', accent: 'right order.',
    subtitle: 'Follow the story without spoilers. Track your progress all the way to Doomsday.',
  },
  booking: {
    eyebrow: '03 / THE BIG SCREEN',
    title: 'Bring the whole', accent: 'crew.',
    subtitle: 'Create your cinemas and find the fewest bundles for an exact-size watch party.',
  },
};

export default function App() {
  const [tab, setTab] = useState<Tab>('movies');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [cinemas, setCinemas] = useState<Cinema[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(true);
  const [cinemasLoading, setCinemasLoading] = useState(true);
  const [moviesError, setMoviesError] = useState<unknown>(null);
  const [cinemasError, setCinemasError] = useState<unknown>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const notify = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    setToast({ message, tone });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const refreshMovies = useCallback(async () => {
    setMoviesLoading(true);
    setMoviesError(null);
    try {
      setMovies(sortByTitle(await api.listMovies()));
    } catch (error) {
      setMoviesError(error);
    } finally {
      setMoviesLoading(false);
    }
  }, []);

  const refreshCinemas = useCallback(async () => {
    setCinemasLoading(true);
    setCinemasError(null);
    try {
      setCinemas(sortByName(await api.listCinemas()));
    } catch (error) {
      setCinemasError(error);
    } finally {
      setCinemasLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMovies();
    void refreshCinemas();
  }, [refreshMovies, refreshCinemas]);

  const addMovie = async (payload: NewMovie) => {
    const created = await api.createMovie(payload);
    setMovies((existing) => sortByTitle([...existing, created]));
    notify(`Added “${created.title}” to your collection.`);
    return created;
  };

  const patchMovie = async (id: string, payload: MoviePatch) => {
    const updated = await api.patchMovie(id, payload);
    setMovies((existing) => sortByTitle(existing.map((movie) => movie.id === id ? updated : movie)));
    return updated;
  };

  const addCinema = async (payload: NewCinema) => {
    const created = await api.createCinema(payload);
    setCinemas((existing) => sortByName([...existing, created]));
    notify(`Cinema “${created.name}” is ready for booking.`);
    return created;
  };

  const watchedMovies = movies.filter((movie) => movie.watched).length;
  const heading = headings[tab];

  return (
    <div className="app-shell">
      <header className="site-header">
        <div className="header-inner">
          <button type="button" className="brand" onClick={() => setTab('movies')} aria-label="Doomsday Ready home">
            <span className="brand-icon"><Icon name="film" size={23} /></span>
            <span className="brand-wordmark">DOOMSDAY <span>READY</span><small>THE MARATHON CONTROL ROOM</small></span>
          </button>
          <nav className="top-nav" aria-label="Main navigation">
            {tabs.map((entry) => <button
              type="button"
              key={entry.id}
              className={`nav-item ${tab === entry.id ? 'active' : ''}`}
              aria-current={tab === entry.id ? 'page' : undefined}
              onClick={() => setTab(entry.id)}
            >
              <Icon name={entry.icon} size={18} /><span>{entry.label}</span>
            </button>)}
          </nav>
          <div className="header-status"><span className="status-dot" /> MISSION CONTROL <span className="status-separator">/</span> ONLINE</div>
        </div>
      </header>

      <main className="main-container">
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow hero-kicker"><span className="eyebrow-dash" /> {heading.eyebrow}</div>
            <h1>{heading.title} <span>{heading.accent}</span></h1>
            <p>{heading.subtitle}</p>
            <div className="hero-pills">
              <span className="hero-pill"><Icon name="checkCircle" size={16} /> CYCLE-SAFE GRAPH</span>
              <span className="hero-pill"><Icon name="spark" size={16} /> EXACT SEAT OPTIMIZER</span>
            </div>
          </div>
          <div className="hero-visual" aria-hidden="true">
            <div className="orbital orbital-outer" />
            <div className="orbital orbital-inner" />
            <div className="hero-center"><Icon name="film" size={44} /></div>
            <span className="orbit-node node-a" /><span className="orbit-node node-b" /><span className="orbit-node node-c" />
            <div className="orbit-label">// READY FOR WHAT'S NEXT</div>
          </div>
        </section>

        <div className="overview-bar" aria-label="Collection overview">
          <div className="overview-item"><Icon name="film" size={19} /><span>Movies tracked</span><strong>{moviesLoading ? '—' : movies.length}</strong></div>
          <div className="overview-item"><Icon name="checkCircle" size={19} /><span>Movies watched</span><strong>{moviesLoading ? '—' : watchedMovies}</strong></div>
          <div className="overview-item"><Icon name="ticket" size={19} /><span>Cinemas available</span><strong>{cinemasLoading ? '—' : cinemas.length}</strong></div>
          <div className="overview-side">SYSTEM STATUS <span className="status-dot" /> CONNECTED VIA API</div>
        </div>

        {tab !== 'booking' && moviesError && <div className="load-error"><ErrorBanner error={moviesError} /><button className="button button-outline" onClick={() => void refreshMovies()}><Icon name="refresh" size={16} /> Retry loading movies</button></div>}
        {tab === 'booking' && cinemasError && <div className="load-error"><ErrorBanner error={cinemasError} /><button className="button button-outline" onClick={() => void refreshCinemas()}><Icon name="refresh" size={16} /> Retry loading cinemas</button></div>}

        {tab === 'movies' && <MoviesView movies={movies} loading={moviesLoading} onCreate={addMovie} onPatch={patchMovie} onNotify={notify} />}
        {tab === 'rewatch' && <RewatchView movies={movies} loading={moviesLoading} onPatch={patchMovie} onNotify={notify} />}
        {tab === 'booking' && <BookingView cinemas={cinemas} loading={cinemasLoading} onCreate={addCinema} />}
      </main>

      <footer className="site-footer"><span>DOOMSDAY READY <span className="footer-dot">✦</span> KEEP THE TIMELINE INTACT</span><span>BUILT FOR THE ULTIMATE MOVIE MARATHON</span></footer>

      {toast && <div role="status" className={`toast toast-${toast.tone}`}>
        <Icon name={toast.tone === 'success' ? 'checkCircle' : 'alert'} size={20} />
        <span>{toast.message}</span>
        <button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}><Icon name="x" size={16} /></button>
      </div>}
    </div>
  );
}
