const greeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
};

export default function GreetingHeader({ name = "" }) {
  return <h1 className="page-title">{greeting()}{name ? `, ${name}` : ""}</h1>;
}
