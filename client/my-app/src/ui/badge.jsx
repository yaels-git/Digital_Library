export function Badge({ variant = "brand", className = "", ...props }) {
  const map = { brand: "badge badge-brand", secondary: "badge badge-secondary", outline: "badge badge-outline" };
  return <span className={`${map[variant] ?? map.brand} ${className}`} {...props} />;
}
