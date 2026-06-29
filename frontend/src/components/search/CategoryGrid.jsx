const colors = ["#8D67AB", "#BA5D07", "#E8115B", "#148A08", "#0D73EC", "#D84000", "#477D95", "#AF2896"];

export default function CategoryGrid({ categories = [], onSelect }) {
  return (
    <div className="category-grid">
      {categories.map((category, index) => (
        <button
          key={category.id}
          className="category-tile"
          style={{ background: category.color || colors[index % colors.length] }}
          onClick={() => onSelect?.(category)}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
