import { useEffect, useRef, useState } from 'react';
import { api, type Movie, type MoviePatch, type RewatchOrder } from '../api';
import { EmptyState, ErrorBanner, SectionTitle } from '../components/Feedback';
import { Icon } from '../components/Icons';
import { formatWatchTime } from '../utils';

interface Props {
  movies: Movie[];
  loading: boolean;
  onPatch: (id: string, patch: MoviePatch) => Promise<Movie>;
  onNotify: (message: string) => void;
}

function withWatched(plan: RewatchOrder, movieId: string, watched: boolean): RewatchOrder {
  const prerequisites = plan.prerequisites.map((movie) => movie.id === movieId ? { ...movie, watched } : movie);
  return {
    ...plan,
    prerequisites,
    watchedCount: prerequisites.filter((movie) => movie.watched).length,
    remainingRuntimeMinutes: prerequisites.reduce((minutes, movie) => minutes + (movie.watched ? 0 : movie.runtimeMinutes), 0),
  };
}

export default function RewatchView({ movies, loading, onPatch, onNotify }: Props) {
  const [targetId, setTargetId] = useState('');
  const [plan, setPlan] = useState<RewatchOrder | null>(null);
  const [fetching, setFetching] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const targetRef = useRef(targetId);
  targetRef.current = targetId;

  useEffect(() => {
    setTargetId((previous) => {
      if (movies.some((movie) => movie.id === previous)) return previous;
      return movies.find((movie) => movie.title === 'Avengers: Doomsday')?.id ?? movies[0]?.id ?? '';
    });
  }, [movies]);

  // Refresh from the actual API whenever target or shared movie records change.
  // The cleanup discards older responses after quick target changes or PATCHes.
  useEffect(() => {
    if (!targetId) { setPlan(null); setFetching(false); return; }
    let active = true;
    setFetching(true);
    setError(null);
    void api.rewatchOrder(targetId).then((result) => {
      if (active) setPlan(result);
    }).catch((reason: unknown) => {
      if (active) { setPlan(null); setError(reason); }
    }).finally(() => {
      if (active) setFetching(false);
    });
    return () => { active = false; };
  }, [targetId, movies]);

  const toggleWatched = async (movie: Movie, watched: boolean) => {
    if (savingId) return;
    const originalTarget = targetId;
    const previousPlan = plan;
    setError(null);
    setSavingId(movie.id);
    setPlan((current) => current?.targetMovieId === originalTarget ? withWatched(current, movie.id, watched) : current);
    try {
      await onPatch(movie.id, { watched });
      onNotify(watched ? `Watched: ${movie.title}` : `Added back to your watchlist: ${movie.title}`);
      // onPatch updates shared movies, triggering a fresh GET /rewatch-order above.
    } catch (reason) {
      if (targetRef.current === originalTarget) setPlan(previousPlan);
      setError(reason);
    } finally {
      setSavingId(null);
    }
  };

  const target = movies.find((movie) => movie.id === targetId);
  const currentPlan = plan?.targetMovieId === targetId ? plan : null;
  const total = currentPlan?.prerequisites.length ?? 0;
  const watched = currentPlan?.watchedCount ?? 0;
  const percent = total ? Math.round((watched / total) * 100) : 100;

  return <section className="rewatch-page">
    <div className="rewatch-toolbar">
      <SectionTitle eyebrow="THE STORY PATH" title="Your rewatch plan" description="Prerequisites first. No repeats. No timeline confusion." />
      <label className="form-field target-select"><span>SELECT YOUR DESTINATION</span>
        <div className="select-wrap"><select aria-label="Target movie" value={targetId} disabled={loading || movies.length === 0} onChange={(event) => { setTargetId(event.target.value); setPlan(null); setError(null); }}>
          {movies.length === 0 && <option value="">No movies available</option>}
          {movies.map((movie) => <option key={movie.id} value={movie.id}>{movie.title}</option>)}
        </select><Icon name="chevron" size={18} /></div>
      </label>
    </div>

    {loading && movies.length === 0 ? <div className="loading-panel">Loading movies…</div>
      : movies.length === 0 ? <EmptyState icon="film" title="No target movies yet" description="Visit Movies to add a title before building a rewatch plan." />
      : <>
        <div className="rewatch-overview">
          <div className="progress-panel panel">
            <div className="progress-topline"><span className="eyebrow">MISSION PROGRESS</span><span className="progress-status"><span className="status-dot" /> LIVE TRACKING</span></div>
            <div className="progress-content">
              <div className="progress-percent">{currentPlan ? percent : '—'}<span>%</span></div>
              <div className="progress-description"><strong>{currentPlan ? `${watched} of ${total} watched` : 'Loading your plan'}</strong><span>Completed prerequisite movies</span></div>
            </div>
            <div className="progress-track" role="progressbar" aria-label="Rewatch progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={currentPlan ? percent : 0}>
              <div className="progress-fill" style={{ width: `${currentPlan ? percent : 0}%` }} />
            </div>
            <div className="progress-caption"><span>START</span><span>READY FOR {target?.title.toUpperCase() ?? 'DOOMSDAY'}</span></div>
          </div>
          <div className="time-panel panel"><span className="eyebrow">TIME UNTIL YOU'RE READY</span>
            <div className="time-panel-icon"><Icon name="clock" size={26} /></div>
            <div className="remaining-label">REMAINING WATCH TIME</div>
            <strong className="time-value">{currentPlan ? `${currentPlan.remainingRuntimeMinutes}` : '—'} <span>MIN</span></strong>
            <p>{currentPlan ? formatWatchTime(currentPlan.remainingRuntimeMinutes) : 'Calculating remaining watch time…'}</p>
          </div>
        </div>

        <ErrorBanner error={error} onDismiss={() => setError(null)} />

        <div className="plan-section">
          <div className="plan-section-header"><div><span className="eyebrow">WATCH ORDER</span><h2>The path to <span>{target?.title}</span></h2><p>Ordered so every prerequisite appears before the movies that depend on it.</p></div>
            {currentPlan && <span className="count-badge">{total} STEPS</span>}
          </div>
          {fetching && !currentPlan ? <div className="loading-panel">Building your story path…</div>
            : currentPlan && total === 0 ? <EmptyState icon="checkCircle" title="You're ready to go" description="This movie has no prerequisites. Hit play whenever you're ready." />
              : currentPlan ? <div className="timeline-list">
                {currentPlan.prerequisites.map((movie, index) => <article className={`timeline-item ${movie.watched ? 'timeline-complete' : ''}`} key={movie.id}>
                  <div className="timeline-marker"><span>{movie.watched ? <Icon name="check" size={17} /> : String(index + 1).padStart(2, '0')}</span></div>
                  <div className="timeline-body"><span className="timeline-step">CHAPTER {String(index + 1).padStart(2, '0')}</span><h3>{movie.title}</h3>
                    <div className="movie-meta"><span><Icon name="calendar" size={15} /> {movie.releaseYear}</span><span><Icon name="clock" size={15} /> {movie.runtimeMinutes} min</span></div>
                  </div>
                  <label className="timeline-check"><input type="checkbox" checked={movie.watched} disabled={savingId !== null} aria-label={`Mark ${movie.title} as ${movie.watched ? 'unwatched' : 'watched'}`} onChange={(event) => void toggleWatched(movie, event.target.checked)} />
                    <span className="custom-checkbox"><Icon name="check" size={17} /></span><span>{movie.watched ? 'Watched' : 'Mark watched'}</span>
                  </label>
                </article>)}
                <div className="timeline-destination"><span className="destination-icon"><Icon name="spark" size={19} /></span><div><span className="eyebrow">FINAL DESTINATION</span><strong>{target?.title}</strong><p>All prerequisite movies lead here.</p></div><Icon name="arrowRight" size={20} /></div>
              </div> : null}
        </div>
      </>}
  </section>;
}
