import ContentCard from "./ContentCard";

export default function SectionRow({ title, items = [], onPlay }) {
  if (!items.length) return null;

  return (
    <section className="section-row">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      <div className="card-row">
        {items.map((item, index) => (
          <ContentCard key={item._id || item.videoId || item.playlistId || item.browseId || index} item={item} onPlay={onPlay} />
        ))}
      </div>
    </section>
  );
}
