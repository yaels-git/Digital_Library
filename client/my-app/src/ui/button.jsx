export function Button({ variant = "primary", className = "", ...props }) {
  const base = "btn";
  const map = { primary: "btn-primary", outline: "btn-outline" };
  return <button className={`${base} ${map[variant] ?? map.primary} ${className}`} {...props} />;
}
