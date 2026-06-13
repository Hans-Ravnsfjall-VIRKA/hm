// Frásøgn: ESPN's minute-by-minute commentary, newest first.
// `commentary` is [{ m, text }].
export default function MatchCommentary({ commentary }) {
  if (!Array.isArray(commentary) || !commentary.length) {
    return <div className="empty"><p>Eingin frásøgn enn.</p></div>;
  }
  return (
    <div className="mcomm">
      {commentary.map((c, i) => (
        <div className="mcomm-row" key={i}>
          <span className="mcomm-min mono">{c.m || ''}</span>
          <span className="mcomm-text">{c.text}</span>
        </div>
      ))}
    </div>
  );
}
