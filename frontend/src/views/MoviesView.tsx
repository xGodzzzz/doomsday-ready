import { useMemo, useState, type FormEvent } from 'react';
import type { Movie, MoviePatch, NewMovie } from '../api';
import { EmptyState, ErrorBanner, SectionTitle } from '../components/Feedback';
import { Icon } from '../components/Icons';
import { parseInteger } from '../utils';

interface Props {
  movies: Movie[];
  loading: boolean;
  onCreate: (movie: NewMovie) => Promise<Movie>;
  onPatch: (id: string, patch: MoviePatch) => Promise<Movie>;
  onNotify: (message: string) => void;
}

function CreateMovieForm({ movies, onCreate }: Pick<Props, 'movies' | 'onCreate'>) {
  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState('');
  const [runtime, setRuntime] = useState('');
  const [prerequisites, setPrerequisites] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const togglePrerequisite = (id: string, checked: boolean) => {
    setError(null);
    setPrerequisites((existing) => checked ? [...existing, id] : existing.filter((item) => item !== id));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    try {
      if (!title.trim() || title.trim().length > 255) throw new Error('Title must be between 1 and 255 characters.');
      const year = parseInteger(releaseYear, 'Release year');
      const minutes = parseInteger(runtime, 'Runtime', 1, 300);
      setSaving(true);
      await onCreate({ title: title.trim(), releaseYear: year, runtimeMinutes: minutes, prerequisites });
      setTitle(''); setReleaseYear(''); setRuntime(''); setPrerequisites([]);
    } catch (reason) {
      setError(reason);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="panel create-panel" aria-labelledby="create-movie-title">
      <div className="panel-heading">
        <span className="panel-icon"><Icon name="plus" size={19} /></span>
        <div><div className="eyebrow">NEW ENTRY</div><h3 id="create-movie-title">Add a movie</h3></div>
      </div>
      <p className="panel-intro">Every epic timeline starts with a title. Add a movie and connect its storyline.</p>
      <form className="form-stack" onSubmit={(event) => void submit(event)} noValidate>
        <label className="form-field"><span>Movie title <span className="required">*</span></span>
          <input value={title} onChange={(event) => { setTitle(event.target.value); setError(null); }} placeholder="e.g. Avengers: Secret Wars" maxLength={255} required disabled={saving} />
        </label>
        <div className="form-grid-two">
          <label className="form-field"><span>Release year <span className="required">*</span></span>
            <input type="number" step="1" value={releaseYear} onChange={(event) => { setReleaseYear(event.target.value); setError(null); }} placeholder="2027" required disabled={saving} />
          </label>
          <label className="form-field"><span>Runtime (mins) <span className="required">*</span></span>
            <input type="number" min="1" max="300" step="1" value={runtime} onChange={(event) => { setRuntime(event.target.value); setError(null); }} placeholder="120" required disabled={saving} />
          </label>
        </div>
        <fieldset className="check-fieldset">
          <legend>Prerequisite movies <span className="optional">OPTIONAL</span></legend>
          <div className="field-hint">Which movies should be watched first?</div>
          <div className="checkbox-scroll">
            {movies.length === 0 ? <p className="no-options">No movies yet. Your first movie starts the timeline.</p>
              : movies.map((movie) => <label className="checkbox-option" key={movie.id}>
                <input type="checkbox" checked={prerequisites.includes(movie.id)} disabled={saving} onChange={(event) => togglePrerequisite(movie.id, event.target.checked)} />
                <span className="option-name">{movie.title}</span><span className="option-year">{movie.releaseYear}</span>
              </label>)}
          </div>
          <span className="field-hint selection-count">{prerequisites.length} selected</span>
        </fieldset>
        <ErrorBanner error={error} onDismiss={() => setError(null)} />
        <button className="button button-primary button-full" type="submit" disabled={saving}>
          {saving ? 'Adding movie…' : <><Icon name="plus" size={18} /> Add to collection <Icon name="arrowRight" size={17} /></>}
        </button>
      </form>
    </section>
  );
}

function MovieCard({ movie, movies, onPatch, onNotify }: Pick<Props, 'movies' | 'onPatch' | 'onNotify'> & { movie: Movie }) {
  const [editing, setEditing] = useState(false);
  const [draftPrereqs, setDraftPrereqs] = useState<string[]>(movie.prerequisites);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const allById = useMemo(() => new Map(movies.map((item) => [item.id, item.title])), [movies]);

  const openEditor = () => {
    setDraftPrereqs([...movie.prerequisites]);
    setError(null);
    setEditing(true);
  };
  const toggleWatched = async (watched: boolean) => {
    setError(null); setSaving(true);
    try {
      await onPatch(movie.id, { watched });
      onNotify(watched ? `Marked “${movie.title}” as watched.` : `Marked “${movie.title}” as unwatched.`);
    } catch (reason) { setError(reason); }
    finally { setSaving(false); }
  };
  const savePrerequisites = async () => {
    setError(null); setSaving(true);
    try {
      await onPatch(movie.id, { prerequisites: draftPrereqs });
      setEditing(false);
      onNotify(`Updated prerequisites for “${movie.title}”.`);
    } catch (reason) { setError(reason); }
    finally { setSaving(false); }
  };

  return (
    <article className={`movie-card ${movie.watched ? 'movie-watched' : ''}`}>
      <div className="movie-main">
        <div className="movie-art"><Icon name="film" size={27} /><span className="movie-art-line" /></div>
        <div className="movie-info">
          <div className="movie-title-row"><h3>{movie.title}</h3>{movie.watched && <span className="mini-tag success"><Icon name="check" size={12} /> WATCHED</span>}</div>
          <div className="movie-meta"><span><Icon name="calendar" size={14} /> {movie.releaseYear}</span><span><Icon name="clock" size={14} /> {movie.runtimeMinutes} min</span></div>
        </div>
        <label className="watched-toggle" title={movie.watched ? 'Mark unwatched' : 'Mark watched'}>
          <input type="checkbox" checked={movie.watched} disabled={saving} onChange={(event) => void toggleWatched(event.target.checked)} aria-label={`Mark ${movie.title} as ${movie.watched ? 'unwatched' : 'watched'}`} />
          <span className="toggle-track"><span className="toggle-knob" /></span>
        </label>
      </div>
      <div className="movie-card-bottom">
        <div className="prerequisite-list"><Icon name="link" size={14} />
          {movie.prerequisites.length === 0 ? <span className="muted">No prerequisites</span>
            : <span><strong>Watch first:</strong> {movie.prerequisites.map((id) => allById.get(id) ?? 'Unknown movie').join(' · ')}</span>}
        </div>
        <button className={`small-link ${editing ? 'active' : ''}`} type="button" onClick={() => editing ? setEditing(false) : openEditor()} disabled={saving} aria-expanded={editing}>
          <Icon name={editing ? 'x' : 'edit'} size={15} /> {editing ? 'Close' : 'Edit links'}
        </button>
      </div>
      {editing && <div className="inline-editor">
        <div className="inline-editor-title"><strong>Edit prerequisites</strong><span>Select movies that must come before this one.</span></div>
        <div className="inline-options">
          {movies.filter((candidate) => candidate.id !== movie.id).length === 0
            ? <p className="no-options">Add another movie to make a prerequisite connection.</p>
            : movies.filter((candidate) => candidate.id !== movie.id).map((candidate) =>
              <label className="checkbox-option" key={candidate.id}>
                <input type="checkbox" checked={draftPrereqs.includes(candidate.id)} disabled={saving} onChange={(event) => {
                  setError(null);
                  setDraftPrereqs((existing) => event.target.checked ? [...existing, candidate.id] : existing.filter((id) => id !== candidate.id));
                }} />
                <span className="option-name">{candidate.title}</span><span className="option-year">{candidate.releaseYear}</span>
              </label>)}
        </div>
        <div className="editor-actions"><button className="button button-outline" type="button" disabled={saving} onClick={() => { setEditing(false); setError(null); }}>Cancel</button>
          <button className="button button-primary" type="button" disabled={saving} onClick={() => void savePrerequisites()}>{saving ? 'Saving…' : 'Save prerequisites'}</button></div>
      </div>}
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
    </article>
  );
}

export default function MoviesView({ movies, loading, onCreate, onPatch, onNotify }: Props) {
  const [search, setSearch] = useState('');
  const filtered = movies.filter((movie) => movie.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  return (
    <section className="view-grid movies-grid">
      <div className="left-rail"><CreateMovieForm movies={movies} onCreate={onCreate} />
        <div className="tip-panel"><Icon name="spark" size={19} /><div><strong>Timeline tip</strong><p>Prerequisites are checked for circular dependencies every time you create or update a movie.</p></div></div>
      </div>
      <div className="right-rail">
        <div className="collection-toolbar"><SectionTitle eyebrow="THE LIBRARY" title="Movie collection" description="Your connected stories, all in one place." /><span className="count-badge">{movies.length} TITLES</span></div>
        <label className="search-box"><Icon name="search" size={18} /><input aria-label="Search movies" placeholder="Search your collection..." value={search} onChange={(event) => setSearch(event.target.value)} /></label>
        <div className="movie-list">
          {loading ? <div className="loading-panel">Loading your movie collection…</div>
            : filtered.length ? filtered.map((movie) => <MovieCard key={movie.id} movie={movie} movies={movies} onPatch={onPatch} onNotify={onNotify} />)
              : search ? <EmptyState icon="search" title="No matching movies" description="Try another title or clear the search to see everything." />
                : <EmptyState icon="film" title="Your timeline is blank" description="Add a movie to get started. Every great marathon begins somewhere." />}
        </div>
      </div>
    </section>
  );
}
