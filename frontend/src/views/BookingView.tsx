import { useEffect, useState, type FormEvent } from 'react';
import { api, type BookingQuote, type Cinema, type NewCinema } from '../api';
import { EmptyState, ErrorBanner, SectionTitle } from '../components/Feedback';
import { Icon } from '../components/Icons';
import { parseBundleSizes, parseInteger } from '../utils';

interface Props {
  cinemas: Cinema[];
  loading: boolean;
  onCreate: (cinema: NewCinema) => Promise<Cinema>;
}

function CreateCinemaForm({ onCreate }: Pick<Props, 'onCreate'>) {
  const [name, setName] = useState('');
  const [bundles, setBundles] = useState('');
  const [error, setError] = useState<unknown>(null);
  const [saving, setSaving] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); setError(null);
    try {
      if (!name.trim() || name.trim().length > 255) throw new Error('Cinema name must be between 1 and 255 characters.');
      const bundleSizes = parseBundleSizes(bundles);
      setSaving(true);
      await onCreate({ name: name.trim(), bundleSizes });
      setName(''); setBundles('');
    } catch (reason) { setError(reason); }
    finally { setSaving(false); }
  };

  return <section className="panel create-panel" aria-labelledby="create-cinema-title">
    <div className="panel-heading"><span className="panel-icon"><Icon name="plus" size={19} /></span><div><span className="eyebrow">NEW VENUE</span><h3 id="create-cinema-title">Register a cinema</h3></div></div>
    <p className="panel-intro">Set up a screening venue with the bundle sizes it offers.</p>
    <form className="form-stack" onSubmit={(event) => void submit(event)} noValidate>
      <label className="form-field"><span>Cinema name <span className="required">*</span></span>
        <input value={name} maxLength={255} placeholder="e.g. Stark Screening Room" required disabled={saving} onChange={(event) => { setName(event.target.value); setError(null); }} />
      </label>
      <label className="form-field"><span>Seat bundle sizes <span className="required">*</span></span>
        <input value={bundles} placeholder="e.g. 1, 3, 4, 10" required disabled={saving} onChange={(event) => { setBundles(event.target.value); setError(null); }} aria-describedby="bundle-hint" />
        <span className="field-hint" id="bundle-hint">Separate with commas or spaces. 1–10 unique whole numbers, each 1–500.</span>
      </label>
      <ErrorBanner error={error} onDismiss={() => setError(null)} />
      <button className="button button-primary button-full" type="submit" disabled={saving}>{saving ? 'Registering…' : <><Icon name="plus" size={18} /> Create cinema <Icon name="arrowRight" size={17} /></>}</button>
    </form>
  </section>;
}

export default function BookingView({ cinemas, loading, onCreate }: Props) {
  const [cinemaId, setCinemaId] = useState('');
  const [groupSize, setGroupSize] = useState('6');
  const [quote, setQuote] = useState<BookingQuote | null>(null);
  const [quoteContext, setQuoteContext] = useState<{ cinemaName: string; groupSize: number } | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [quoting, setQuoting] = useState(false);

  useEffect(() => {
    setCinemaId((current) => cinemas.some((cinema) => cinema.id === current) ? current : (cinemas[0]?.id ?? ''));
  }, [cinemas]);

  const selectedCinema = cinemas.find((cinema) => cinema.id === cinemaId);
  const clearQuote = () => { setQuote(null); setQuoteContext(null); setError(null); };

  const calculate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); clearQuote();
    try {
      if (!selectedCinema) throw new Error('Create or select a cinema first.');
      const size = parseInteger(groupSize, 'Group size', 1, 10_000);
      setQuoting(true);
      const result = await api.bookingQuote(selectedCinema.id, size);
      setQuote(result);
      setQuoteContext({ cinemaName: selectedCinema.name, groupSize: size });
    } catch (reason) { setError(reason); }
    finally { setQuoting(false); }
  };

  return <section className="booking-page">
    <div className="booking-toolbar"><SectionTitle eyebrow="THE GATHERING" title="Watch-party booking" description="The exact seat count, optimized with the fewest possible bundles." /><span className="count-badge">{cinemas.length} VENUES</span></div>
    <div className="view-grid booking-grid">
      <div className="left-rail"><CreateCinemaForm onCreate={onCreate} />
        <div className="tip-panel"><Icon name="layers" size={20} /><div><strong>Bundle math, optimized</strong><p>The backend uses exact-match dynamic programming to minimize the total number of bundles. No extra seats.</p></div></div>
      </div>
      <div className="right-rail">
        <section className="panel calculator-panel">
          <div className="calculator-heading"><div className="panel-heading"><span className="panel-icon gold"><Icon name="ticket" size={20} /></span><div><span className="eyebrow">BOOKING CALCULATOR</span><h3>Find the perfect fit</h3></div></div><span className="mini-tag">EXACT SEATING</span></div>
          <p className="panel-intro">Choose a cinema, enter your crew size, and we'll find the minimum number of seat bundles.</p>
          <form className="booking-form" onSubmit={(event) => void calculate(event)} noValidate>
            <label className="form-field"><span>Select cinema <span className="required">*</span></span>
              <div className="select-wrap"><select value={cinemaId} aria-label="Select cinema" disabled={loading || cinemas.length === 0 || quoting} onChange={(event) => { setCinemaId(event.target.value); clearQuote(); }}>
                {cinemas.length === 0 && <option value="">No cinemas available</option>}
                {cinemas.map((cinema) => <option key={cinema.id} value={cinema.id}>{cinema.name}</option>)}
              </select><Icon name="chevron" size={18} /></div>
            </label>
            <label className="form-field"><span>Group size <span className="required">*</span></span>
              <div className="input-with-icon"><Icon name="users" size={20} /><input type="number" min="1" max="10000" step="1" required value={groupSize} disabled={quoting} onChange={(event) => { setGroupSize(event.target.value); clearQuote(); }} /></div>
              <span className="field-hint">Between 1 and 10,000 people</span>
            </label>
            <button className="button button-primary quote-button" type="submit" disabled={quoting || cinemas.length === 0}>{quoting ? 'Calculating…' : <><Icon name="spark" size={18} /> Calculate minimum bundles <Icon name="arrowRight" size={18} /></>}</button>
          </form>
          {selectedCinema && <div className="available-bundles"><span className="eyebrow">AVAILABLE SEAT BUNDLES</span><div className="bundle-tags">{selectedCinema.bundleSizes.map((size) => <span className="bundle-tag" key={size}>{size} <small>SEATS</small></span>)}</div></div>}
          <ErrorBanner error={error} onDismiss={() => setError(null)} />
        </section>
        {quote && quoteContext && <section className={`quote-result ${quote.possible ? 'quote-success' : 'quote-impossible'}`} aria-live="polite">
          <div className="quote-result-head"><span className="result-icon"><Icon name={quote.possible ? 'checkCircle' : 'alert'} size={26} /></span><div><span className="eyebrow">YOUR BOOKING QUOTE</span><h3>{quote.possible ? 'Perfect match found!' : 'Not possible'}</h3></div></div>
          {quote.possible ? <>
            <div className="quote-big-number">{quote.totalBundles}<span>{quote.totalBundles === 1 ? 'bundle' : 'bundles'} needed</span></div>
            <p className="quote-formula">{quote.totalBundles} {quote.totalBundles === 1 ? 'bundle' : 'bundles'}: {quote.breakdown.map((item) => `${item.bundleSize} × ${item.count}`).join(', ')}</p>
            <div className="quote-breakdown">{quote.breakdown.map((item) => <div className="quote-breakdown-item" key={item.bundleSize}><span className="size-big">{item.bundleSize}</span><span className="times-sign">×</span><span className="quantity-big">{item.count}</span><span className="breakdown-label">{item.bundleSize * item.count} seats</span></div>)}</div>
            <p className="quote-footnote"><Icon name="check" size={17} /> Exactly {quoteContext.groupSize.toLocaleString()} seats at {quoteContext.cinemaName}, with no extras.</p>
          </> : <p className="not-possible-message">{quote.message}. These bundle sizes cannot seat exactly {quoteContext.groupSize.toLocaleString()} people. Try a different group size or venue.</p>}
        </section>}
        <section className="venues-section"><div className="venues-heading"><span className="eyebrow">REGISTERED CINEMAS</span><strong>Available venues</strong></div>
          {loading ? <div className="loading-panel">Loading cinemas…</div>
            : cinemas.length === 0 ? <EmptyState icon="ticket" title="No cinemas registered" description="Create a cinema on the left to start planning your screening." />
              : <div className="venue-list">{cinemas.map((cinema) => <button type="button" key={cinema.id} className={`venue-row ${cinemaId === cinema.id ? 'venue-selected' : ''}`} disabled={quoting} onClick={() => { setCinemaId(cinema.id); clearQuote(); }}>
                <span className="venue-icon"><Icon name="film" size={20} /></span><span className="venue-info"><strong>{cinema.name}</strong><span>{[...cinema.bundleSizes].sort((a, b) => b - a).join(' · ')} seat bundles</span></span><Icon name={cinemaId === cinema.id ? 'checkCircle' : 'arrowRight'} size={19} />
              </button>)}</div>}
        </section>
      </div>
    </div>
  </section>;
}
